-- ================================================================
-- MIGRATION: Reliable admin access and global catalog visibility
-- Purpose:
--   - Make admin RLS checks use a SECURITY DEFINER helper.
--   - Promote known admin emails in profiles.
--   - Keep storefront products global while admin writes stay restricted.
-- Run this in the Supabase SQL Editor after the base schema.
-- ================================================================

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM public.profiles p WHERE p.id = user_id),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated;

-- Add every real staff/admin email here.
UPDATE public.profiles
SET is_admin = TRUE,
    updated_at = NOW()
WHERE lower(email) IN (
  'malanharith@gmail.com'
);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full product access" ON public.products;
DROP POLICY IF EXISTS "Admins have full order access" ON public.orders;
DROP POLICY IF EXISTS "Admins have full history access" ON public.order_status_history;
DROP POLICY IF EXISTS "Admins can manage bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can manage subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Admins can manage discounts" ON public.discounts;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins have full product access"
  ON public.products FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins have full order access"
  ON public.orders FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins have full history access"
  ON public.order_status_history FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage bank accounts"
  ON public.bank_accounts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage all reviews"
  ON public.reviews FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage subscribers"
  ON public.subscribers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage discounts"
  ON public.discounts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Helpful indexes for admin/customer views.
CREATE INDEX IF NOT EXISTS idx_products_active_sort
  ON public.products(is_active, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_customer_email_created
  ON public.orders(lower(customer_email), created_at DESC)
  WHERE customer_email IS NOT NULL;

