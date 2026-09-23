-- ================================================================
-- YARL SIHINA (யாழ் சிஹினா) - Database Schema & Supabase Setup
-- ================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT ('YS-' || UPPER(SUBSTRING(uuid_generate_v4()::text, 1, 6))),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    customer_address TEXT NOT NULL,
    customer_city TEXT,
    notes TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    advance_required NUMERIC NOT NULL DEFAULT 0,
    balance_cod NUMERIC NOT NULL DEFAULT 0,
    delivery_fee NUMERIC NOT NULL DEFAULT 0,
    
    -- Slip & Payment Details
    slip_url TEXT,
    slip_reference TEXT,
    bank_name TEXT,
    deposit_date DATE,
    status TEXT NOT NULL DEFAULT 'slip_review', 
    -- Status options: 'pending_slip', 'slip_review', 'advance_verified', 'packing', 'dispatched', 'delivered', 'rejected', 'cancelled'
    
    -- Courier & Dispatch
    courier_name TEXT, -- 'Koombiyo', 'Domex', 'Pronto', 'Ceylon Post'
    courier_tracking_no TEXT,
    
    -- Verification & Admin Audit
    admin_notes TEXT,
    verified_at TIMESTAMPTZ,
    verified_by TEXT
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_tamil TEXT,
    category TEXT NOT NULL, -- 'tshirt', 'croptop', 'couple'
    price NUMERIC NOT NULL,
    original_price NUMERIC,
    badge TEXT,
    tag TEXT,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    stock_by_size JSONB NOT NULL DEFAULT '{"XS":15,"S":25,"M":40,"L":35,"XL":20,"XXL":10}'::jsonb,
    is_couple BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Storage Bucket for Bank Slips
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-slips', 'payment-slips', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Row Level Security (RLS) Setup
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products: Everyone can read products
CREATE POLICY "Public can read products" 
ON public.products FOR SELECT 
USING (true);

-- Products: Admins can update products
CREATE POLICY "Admins can update products" 
ON public.products FOR ALL 
USING (auth.role() = 'authenticated');

-- Orders: Customers can insert their orders
CREATE POLICY "Customers can insert orders" 
ON public.orders FOR INSERT 
WITH CHECK (true);

-- Orders: Authenticated users can view their own orders
CREATE POLICY "Users can view their own orders" 
ON public.orders FOR SELECT 
USING (
    customer_id = auth.uid() 
    OR auth.role() = 'authenticated'
);

-- Orders: Admins have full access
CREATE POLICY "Admins can modify orders" 
ON public.orders FOR ALL 
USING (auth.role() = 'authenticated');

-- Storage Policy: Anyone can upload a slip image
CREATE POLICY "Public can upload payment slips" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'payment-slips');

-- Storage Policy: Anyone can read uploaded slips for verification
CREATE POLICY "Public can view payment slips" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'payment-slips');

-- 6. Initial Seed Data (Sample Orders for Verification Testing)
INSERT INTO public.orders (
    id, customer_name, customer_phone, customer_email, customer_address, 
    items, total_amount, advance_required, balance_cod, delivery_fee, 
    slip_url, slip_reference, bank_name, deposit_date, status
) VALUES 
(
    'YS-8821', 
    'Thivagar Vasanthan', 
    '+94771234567', 
    'thivagar@example.com', 
    'No. 45, Temple Road, Nallur, Jaffna', 
    '[{"id":"p1_couple","title":"Signature Ceylon Couple Set","hisSize":"L","herSize":"M","quantity":1,"price":3100,"image":"/img/couple1.jpg"}]'::jsonb, 
    3100, 
    1000, 
    2100, 
    0, 
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80', 
    'COMM-TRX-99824', 
    'Commercial Bank', 
    CURRENT_DATE, 
    'slip_review'
),
(
    'YS-8822', 
    'Anushya Rajendran', 
    '+94769876543', 
    'anushya@example.com', 
    '12/3 Sea Street, Wellawatte, Colombo 06', 
    '[{"id":"p2","title":"Heritage Classic Crop Top","size":"S","quantity":1,"price":1650,"image":"/img/crop-black.png"}]'::jsonb, 
    2000, 
    500, 
    1500, 
    350, 
    'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=800&q=80', 
    'BOC-FT-44120', 
    'Bank of Ceylon (BOC)', 
    CURRENT_DATE, 
    'slip_review'
),
(
    'YS-8819', 
    'Kabilan Sivakumar', 
    '+94715556677', 
    'kabilan@example.com', 
    'Kandy Road, Vavuniya', 
    '[{"id":"p1","title":"Heritage Classic T-Shirt","size":"XL","quantity":2,"price":3700,"image":"/img/tshirt-black.png"}]'::jsonb, 
    3700, 
    1000, 
    2700, 
    0, 
    'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=800&q=80', 
    'HNB-ONLINE-7128', 
    'Hatton National Bank (HNB)', 
    CURRENT_DATE - INTERVAL '1 day', 
    'advance_verified'
)
ON CONFLICT (id) DO NOTHING;
