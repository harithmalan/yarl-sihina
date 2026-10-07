-- ================================================================
-- MIGRATION: Add OCR / Slip-Analysis columns to orders table
-- Run this in the Supabase SQL Editor after deploying the OCR service
-- ================================================================

-- Add OCR metadata columns to the orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ocr_ref_number       TEXT,
  ADD COLUMN IF NOT EXISTS ocr_beneficiary_name TEXT,
  ADD COLUMN IF NOT EXISTS ocr_confidence       NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS ocr_raw_text         TEXT,
  ADD COLUMN IF NOT EXISTS is_duplicate_flagged BOOLEAN DEFAULT FALSE NOT NULL;

-- Index for fast duplicate ref lookup (used by the duplicate_checker service)
CREATE INDEX IF NOT EXISTS idx_orders_slip_reference
  ON public.orders(slip_reference)
  WHERE slip_reference IS NOT NULL
    AND status NOT IN ('rejected', 'cancelled');

COMMENT ON COLUMN public.orders.ocr_ref_number IS
  'Reference number extracted by the AI OCR service from the uploaded slip image';
COMMENT ON COLUMN public.orders.ocr_beneficiary_name IS
  'Beneficiary / account name extracted by AI OCR from the slip image';
COMMENT ON COLUMN public.orders.ocr_confidence IS
  'OCR extraction confidence score (0.0 – 1.0)';
COMMENT ON COLUMN public.orders.ocr_raw_text IS
  'Raw OCR text output (first 2000 chars) for admin debugging';
COMMENT ON COLUMN public.orders.is_duplicate_flagged IS
  'TRUE if the OCR service detected this slip as a potential duplicate at upload time';

