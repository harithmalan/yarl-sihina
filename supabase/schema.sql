-- ================================================================
-- YARL SIHINA (யாழ் சிஹினா) — Production Database Schema
-- Platform : Supabase (PostgreSQL 15)
-- Version  : 2.0  |  Last updated: 2026-09-24
--
-- RUN ORDER:
--   1. Extensions
--   2. Tables (with constraints)
--   3. Indexes
--   4. Row Level Security (RLS) Policies
--   5. Storage Buckets & Policies
--   6. Functions & Triggers
--   7. Seed Data (products + demo orders)
-- ================================================================


-- ================================================================
-- 1. EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ================================================================
-- 2. TABLES
-- ================================================================

-- ----------------------------------------------------------------
-- 2A. CUSTOMERS / USER PROFILES
--     Extended profile table linked to Supabase Auth (auth.users).
--     Populated automatically via trigger on first sign-in.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    full_name        TEXT,
    phone            TEXT,
    email            TEXT,
    avatar_url       TEXT,
    provider         TEXT DEFAULT 'email',      -- 'email' | 'google' | 'facebook'
    default_address  TEXT,
    default_city     TEXT,
    is_admin         BOOLEAN DEFAULT FALSE NOT NULL,
    is_banned        BOOLEAN DEFAULT FALSE NOT NULL,
    total_orders     INTEGER DEFAULT 0 NOT NULL,
    lifetime_spend   NUMERIC(12,2) DEFAULT 0 NOT NULL,
    notes            TEXT                       -- internal admin notes on this customer
);

COMMENT ON TABLE public.profiles IS 'Customer profile data extended from Supabase auth.users';
COMMENT ON COLUMN public.profiles.is_admin IS 'Grants full admin portal access';


-- ----------------------------------------------------------------
-- 2B. PRODUCTS CATALOG
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id               TEXT PRIMARY KEY,
    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    name             TEXT NOT NULL,
    name_tamil       TEXT,
    description      TEXT,
    category         TEXT NOT NULL CHECK (category IN ('tshirt', 'crop', 'couple')),
    type             TEXT,
    badge            TEXT,
    tag              TEXT,
    price            NUMERIC(10,2) NOT NULL CHECK (price > 0),
    original_price   NUMERIC(10,2),
    delivery_fee     NUMERIC(10,2) DEFAULT 0,
    image            TEXT,
    images           JSONB DEFAULT '[]'::jsonb,
    stock_by_size    JSONB NOT NULL DEFAULT '{"XS":15,"S":25,"M":40,"L":35,"XL":20,"XXL":10}'::jsonb,
    is_couple        BOOLEAN DEFAULT FALSE NOT NULL,
    total_items_count INTEGER DEFAULT 1 NOT NULL,
    is_active        BOOLEAN DEFAULT TRUE NOT NULL,
    is_featured      BOOLEAN DEFAULT FALSE NOT NULL,
    sort_order       INTEGER DEFAULT 0
);

COMMENT ON TABLE public.products IS 'YARL SIHINA product catalog';


-- ----------------------------------------------------------------
-- 2C. ORDERS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id               TEXT PRIMARY KEY
                         DEFAULT ('YS-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6))),
    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    customer_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name    TEXT NOT NULL,
    customer_phone   TEXT NOT NULL,
    customer_email   TEXT,
    customer_address TEXT NOT NULL,
    customer_city    TEXT,
    customer_district TEXT,
    customer_province TEXT,
    notes            TEXT,
    items            JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    advance_required NUMERIC(12,2) NOT NULL DEFAULT 0,
    balance_cod      NUMERIC(12,2) NOT NULL DEFAULT 0,
    delivery_fee     NUMERIC(12,2) NOT NULL DEFAULT 0,
    slip_url         TEXT,
    slip_reference   TEXT,
    bank_name        TEXT,
    bank_branch      TEXT,
    account_number   TEXT,
    deposit_date     DATE,
    status           TEXT NOT NULL DEFAULT 'pending_slip'
                         CHECK (status IN (
                             'pending_slip',
                             'slip_review',
                             'advance_verified',
                             'packing',
                             'ready_to_ship',
                             'dispatched',
                             'out_for_delivery',
                             'delivered',
                             'rejected',
                             'cancelled',
                             'refund_pending',
                             'refunded'
                         )),
    courier_name       TEXT,
    courier_tracking_no TEXT,
    courier_pickup_date DATE,
    estimated_delivery  DATE,
    dispatch_notes     TEXT,
    admin_notes        TEXT,
    verified_at        TIMESTAMPTZ,
    verified_by        TEXT,
    dispatched_at      TIMESTAMPTZ,
    delivered_at       TIMESTAMPTZ,
    cancelled_at       TIMESTAMPTZ,
    cancellation_reason TEXT,
    source             TEXT DEFAULT 'website'
                           CHECK (source IN ('website', 'whatsapp', 'instagram', 'manual'))
);

COMMENT ON TABLE public.orders IS 'All YARL SIHINA customer orders';


-- ----------------------------------------------------------------
-- 2D. ORDER STATUS HISTORY
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id    TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    changed_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    from_status TEXT,
    to_status   TEXT NOT NULL,
    changed_by  TEXT,
    note        TEXT
);


-- ----------------------------------------------------------------
-- 2E. BANK ACCOUNTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    bank_name      TEXT NOT NULL,
    account_name   TEXT NOT NULL,
    account_number TEXT NOT NULL,
    branch         TEXT,
    ifsc_code      TEXT,
    is_active      BOOLEAN DEFAULT TRUE NOT NULL,
    sort_order     INTEGER DEFAULT 0,
    notes          TEXT
);


-- ----------------------------------------------------------------
-- 2F. PRODUCT REVIEWS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    product_id   TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    customer_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_id     TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    reviewer_name TEXT NOT NULL,
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body         TEXT,
    is_verified  BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    admin_reply  TEXT,
    reply_at     TIMESTAMPTZ
);


-- ----------------------------------------------------------------
-- 2G. NEWSLETTER / WAITLIST SUBSCRIBERS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscribers (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    email        TEXT NOT NULL UNIQUE,
    phone        TEXT,
    source       TEXT DEFAULT 'storefront',
    is_active    BOOLEAN DEFAULT TRUE NOT NULL,
    tags         TEXT[] DEFAULT '{}'
);


-- ----------------------------------------------------------------
-- 2H. DISCOUNT CODES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    code            TEXT NOT NULL UNIQUE,
    description     TEXT,
    discount_type   TEXT NOT NULL DEFAULT 'percent'
                        CHECK (discount_type IN ('percent', 'fixed')),
    discount_value  NUMERIC(10,2) NOT NULL,
    min_order_value NUMERIC(10,2) DEFAULT 0,
    max_uses        INTEGER,
    used_count      INTEGER DEFAULT 0 NOT NULL,
    valid_from      TIMESTAMPTZ DEFAULT NOW(),
    valid_until     TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT TRUE NOT NULL,
    applicable_to   TEXT DEFAULT 'all'
);


-- ================================================================
-- 3. INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_orders_status           ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at       ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id      ON public.orders(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone   ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status_created   ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category       ON public.products(category) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_active_featured ON public.products(is_active, is_featured, sort_order);
CREATE INDEX IF NOT EXISTS idx_reviews_product_published ON public.reviews(product_id, is_published);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email          ON public.profiles(email);


-- ================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ================================================================
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts            ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view their own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"       ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = auth.uid() AND p.is_admin = TRUE));
CREATE POLICY "Admins can update all profiles"     ON public.profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

-- PRODUCTS
CREATE POLICY "Public can read active products" ON public.products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins have full product access" ON public.products FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- ORDERS
CREATE POLICY "Anyone can place an order"         ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers can view their orders"   ON public.orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Admins have full order access"     ON public.orders FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- ORDER STATUS HISTORY
CREATE POLICY "Customers can view their order history" ON public.order_status_history FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));
CREATE POLICY "Admins have full history access" ON public.order_status_history FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- BANK ACCOUNTS
CREATE POLICY "Public can read active bank accounts" ON public.bank_accounts FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage bank accounts"      ON public.bank_accounts FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- REVIEWS
CREATE POLICY "Public can read published reviews"         ON public.reviews FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Authenticated users can submit reviews"    ON public.reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage their own reviews"        ON public.reviews FOR UPDATE USING (customer_id = auth.uid() AND is_published = FALSE);
CREATE POLICY "Admins can manage all reviews"             ON public.reviews FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- SUBSCRIBERS
CREATE POLICY "Anyone can subscribe"          ON public.subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage subscribers" ON public.subscribers FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- DISCOUNTS
CREATE POLICY "Admins can manage discounts"       ON public.discounts FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));
CREATE POLICY "Anyone can look up a discount code" ON public.discounts FOR SELECT
    USING (is_active = TRUE AND used_count < COALESCE(max_uses, 2147483647));


-- ================================================================
-- 5. STORAGE BUCKETS & POLICIES
-- ================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payment-slips', 'payment-slips', TRUE, 5242880,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images', 'product-images', TRUE, 10485760,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Anyone can upload payment slips"    ON storage.objects FOR INSERT  WITH CHECK (bucket_id = 'payment-slips');
CREATE POLICY "Anyone can view payment slips"      ON storage.objects FOR SELECT  USING (bucket_id = 'payment-slips');
CREATE POLICY "Public can view product images"     ON storage.objects FOR SELECT  USING (bucket_id = 'product-images');
CREATE POLICY "Admins can manage product images"   ON storage.objects FOR ALL
    USING (bucket_id = 'product-images' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));


-- ================================================================
-- 6. FUNCTIONS & TRIGGERS
-- ================================================================

-- 6A. Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, provider)
    VALUES (
        NEW.id, NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'provider', 'email')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 6B. Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER orders_updated_at   BEFORE UPDATE ON public.orders   FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER reviews_updated_at  BEFORE UPDATE ON public.reviews  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6C. Auto-log order status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, note)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.verified_by, NEW.admin_notes);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER order_status_changed AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- 6D. Update customer lifetime stats on delivery
CREATE OR REPLACE FUNCTION public.update_customer_lifetime_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.customer_id IS NOT NULL THEN
        UPDATE public.profiles
        SET total_orders   = total_orders + 1,
            lifetime_spend = lifetime_spend + NEW.total_amount
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER order_delivered_stats AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_customer_lifetime_stats();

-- 6E. Decrement stock on advance verification
CREATE OR REPLACE FUNCTION public.reserve_stock_on_verify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    item          JSONB;
    product_row   public.products%ROWTYPE;
    current_stock INTEGER;
    size_key      TEXT;
BEGIN
    IF NEW.status = 'advance_verified' AND OLD.status != 'advance_verified' THEN
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
        LOOP
            SELECT * INTO product_row FROM public.products WHERE id = item->>'id';
            IF FOUND THEN
                IF product_row.is_couple THEN
                    size_key := item->>'hisSize';
                    IF size_key IS NOT NULL THEN
                        current_stock := COALESCE((product_row.stock_by_size->>size_key)::INTEGER, 0);
                        UPDATE public.products SET stock_by_size = jsonb_set(stock_by_size, ARRAY[size_key], to_jsonb(GREATEST(0, current_stock - (item->>'quantity')::INTEGER))) WHERE id = product_row.id;
                    END IF;
                    size_key := item->>'herSize';
                    IF size_key IS NOT NULL THEN
                        current_stock := COALESCE((product_row.stock_by_size->>size_key)::INTEGER, 0);
                        UPDATE public.products SET stock_by_size = jsonb_set(stock_by_size, ARRAY[size_key], to_jsonb(GREATEST(0, current_stock - (item->>'quantity')::INTEGER))) WHERE id = product_row.id;
                    END IF;
                ELSE
                    size_key := COALESCE(item->>'size', 'M');
                    current_stock := COALESCE((product_row.stock_by_size->>size_key)::INTEGER, 0);
                    UPDATE public.products SET stock_by_size = jsonb_set(stock_by_size, ARRAY[size_key], to_jsonb(GREATEST(0, current_stock - (item->>'quantity')::INTEGER))) WHERE id = product_row.id;
                END IF;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER reserve_stock_trigger AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.reserve_stock_on_verify();


-- ================================================================
-- 7. SEED DATA
-- ================================================================

-- 7A. Bank Accounts
INSERT INTO public.bank_accounts (bank_name, account_name, account_number, branch, is_active, sort_order) VALUES
    ('Commercial Bank of Ceylon', 'YARL SIHINA', '8001234567',  'Jaffna Main Branch',  TRUE, 1),
    ('Bank of Ceylon (BOC)',       'YARL SIHINA', '70098765432', 'Jaffna City Branch',  TRUE, 2),
    ('Hatton National Bank (HNB)', 'YARL SIHINA', '019100043210','Jaffna Branch',       TRUE, 3),
    ('Sampath Bank',               'YARL SIHINA', '1011987654',  'Colombo 03',          TRUE, 4)
ON CONFLICT DO NOTHING;

-- 7B. Products
INSERT INTO public.products (id, name, description, category, type, badge, price, original_price, image, images, is_couple, total_items_count, is_active, is_featured, sort_order, stock_by_size)
VALUES
('p1_tshirt','Heritage Classic T-Shirt',
 'Heavyweight 240 GSM organic combed cotton with handcrafted Ceylon heritage motif. Oversized streetwear fit.',
 'tshirt','T-Shirt','Best Seller',1750,2100,'/img/product-1-male.jpeg','["/img/product-1-male.jpeg"]',FALSE,1,TRUE,TRUE,10,'{"XS":12,"S":25,"M":40,"L":35,"XL":20,"XXL":8}'),
('p1_crop','Heritage Classic Crop Top',
 'Soft breathable cotton tailored for a relaxed streetwear silhouette. Ribbed crew neckline with subtle Ceylon heritage print.',
 'crop','Crop Top','Trending',1550,1900,'/img/product-1-female.jpeg','["/img/product-1-female.jpeg"]',FALSE,1,TRUE,TRUE,20,'{"XS":12,"S":25,"M":40,"L":35,"XL":20,"XXL":8}'),
('p1_couple','Heritage Classic Couple Set',
 '1 Heritage Classic T-Shirt + 1 Heritage Classic Crop Top. Custom sizing combination with complimentary islandwide shipping.',
 'couple','Couple Package','Free Delivery',3100,3800,'/img/couple1.jpg','["/img/couple1.jpg","/img/couple2.jpg","/img/couple3.jpg"]',TRUE,2,TRUE,TRUE,5,'{"XS":12,"S":25,"M":40,"L":35,"XL":20,"XXL":8}'),
('p2_tshirt','Jaffna Collective T-Shirt',
 'Modern streetwear cut celebrating Jaffna maritime and architectural culture. Bold graphic front print with heritage-inspired back detail.',
 'tshirt','T-Shirt','Signature',1750,2100,'/img/product-2-male.jpeg','["/img/product-2-male.jpeg"]',FALSE,1,TRUE,FALSE,30,'{"XS":12,"S":25,"M":40,"L":35,"XL":20,"XXL":8}'),
('p2_crop','Jaffna Collective Crop Top',
 'Elevated crop cut with ribbed crew neckline and subtle heritage print.',
 'crop','Crop Top','Popular',1550,1900,'/img/product-2-female.jpeg','["/img/product-2-female.jpeg"]',FALSE,1,TRUE,FALSE,40,'{"XS":12,"S":25,"M":40,"L":35,"XL":20,"XXL":8}'),
('p3_tshirt','Thambapanni Reimagined T-Shirt',
 'Inspired by golden Jaffna sunsets, earth tones and artisan traditions. Heavyweight combed cotton with earthy terracotta-inspired motif.',
 'tshirt','T-Shirt','New Season',1750,2100,'/img/product-3-male.jpeg','["/img/product-3-male.jpeg"]',FALSE,1,TRUE,FALSE,50,'{"XS":12,"S":25,"M":40,"L":35,"XL":20,"XXL":8}'),
('p3_crop','Thambapanni Reimagined Crop Top',
 'Minimalist statement crop top designed for tropical comfort and effortless style.',
 'crop','Crop Top','Limited',1550,1900,'/img/product-3-female.jpeg','["/img/product-3-female.jpeg"]',FALSE,1,TRUE,FALSE,60,'{"XS":12,"S":25,"M":40,"L":35,"XL":20,"XXL":8}')
ON CONFLICT (id) DO UPDATE SET
    name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price,
    original_price=EXCLUDED.original_price, badge=EXCLUDED.badge, image=EXCLUDED.image,
    images=EXCLUDED.images, is_active=EXCLUDED.is_active, is_featured=EXCLUDED.is_featured,
    sort_order=EXCLUDED.sort_order, updated_at=NOW();

-- 7C. Demo Orders
INSERT INTO public.orders (
    id, customer_name, customer_phone, customer_email, customer_address, customer_city, customer_district,
    notes, items, total_amount, advance_required, balance_cod, delivery_fee,
    slip_url, slip_reference, bank_name, deposit_date, status,
    courier_name, courier_tracking_no, admin_notes, verified_at, source
) VALUES
(
    'YS-8821','Thivagar Vasanthan','+94771234567','thivagar@example.com',
    'No. 45, Temple Road, Nallur, Jaffna','Jaffna','Jaffna',
    'Please call before delivery. Prefer afternoon delivery.',
    '[{"id":"p1_couple","title":"Heritage Classic Couple Set","hisSize":"L","herSize":"M","quantity":1,"price":3100,"image":"/img/couple1.jpg"}]',
    3100,1000,2100,0,
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    'COMM-TRX-99824','Commercial Bank of Ceylon',CURRENT_DATE,'slip_review',
    NULL,NULL,NULL,NULL,'website'
),
(
    'YS-8822','Anushya Rajendran','+94769876543','anushya@example.com',
    '12/3 Sea Street, Wellawatte, Colombo 06','Colombo','Colombo',
    'Gift packing if possible, thank you!',
    '[{"id":"p1_crop","title":"Heritage Classic Crop Top","size":"S","quantity":1,"price":1550,"image":"/img/product-1-female.jpeg"}]',
    1900,500,1400,350,
    'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=800&q=80',
    'BOC-FT-44120','Bank of Ceylon (BOC)',CURRENT_DATE,'slip_review',
    NULL,NULL,NULL,NULL,'website'
),
(
    'YS-8819','Kabilan Sivakumar','+94715556677','kabilan@example.com',
    'Kandy Road, Vavuniya','Vavuniya','Vavuniya','',
    '[{"id":"p1_tshirt","title":"Heritage Classic T-Shirt","size":"XL","quantity":2,"price":3500,"image":"/img/product-1-male.jpeg"}]',
    3500,1000,2500,0,
    'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=800&q=80',
    'HNB-ONLINE-7128','Hatton National Bank (HNB)',CURRENT_DATE - INTERVAL '1 day','advance_verified',
    'Domex Express','DMX-9821034','Advance LKR 1000 confirmed in HNB account. Tailoring started.',
    NOW() - INTERVAL '12 hours','website'
)
ON CONFLICT (id) DO NOTHING;


-- ================================================================
-- SCHEMA COMPLETE
-- Sanity checks after deployment:
--   SELECT COUNT(*) FROM public.products WHERE is_active = TRUE;   -- 7
--   SELECT COUNT(*) FROM public.bank_accounts WHERE is_active = TRUE; -- 4
--   SELECT COUNT(*) FROM public.orders;                             -- 3 demo
-- ================================================================
