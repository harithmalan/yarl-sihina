/**
 * slipDuplicateService.js
 * Checks for duplicate payment slip reference numbers.
 *
 * Strategy (in order):
 *  1. Try FastAPI backend at VITE_OCR_API_URL (full analyze + duplicate in one call)
 *  2. Fallback: direct Supabase query from browser (if Supabase is configured)
 *  3. Fallback: returns { isDuplicate: false } if neither is available
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';

/** Base URL for the Python FastAPI OCR microservice */
const OCR_API_URL =
  import.meta.env.VITE_OCR_API_URL || 'http://localhost:8001';

/** Request timeout for the FastAPI backend (ms) */
const API_TIMEOUT_MS = 8000;

/**
 * Check if any of the provided reference numbers already exist
 * in a non-cancelled / non-rejected order.
 *
 * @param {string[]} refNumbers - List of candidate slip reference numbers
 * @returns {Promise<{isDuplicate: boolean, existingOrderId: string|null, existingCustomer: string|null, matchedRef: string|null}>}
 */
export async function checkDuplicateRef(refNumbers) {
  const empty = {
    isDuplicate: false,
    existingOrderId: null,
    existingCustomer: null,
    matchedRef: null,
  };

  if (!refNumbers || refNumbers.length === 0) return empty;

  // ── Strategy 1: FastAPI backend ──────────────────────────────────────────
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const res = await fetch(`${OCR_API_URL}/check-duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref_numbers: refNumbers }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        isDuplicate: data.is_duplicate ?? false,
        existingOrderId: data.existing_order_id ?? null,
        existingCustomer: data.existing_customer ?? null,
        matchedRef: data.matched_ref ?? null,
      };
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('[slipDuplicateService] FastAPI unavailable, using Supabase fallback:', err.message);
    }
  }

  // ── Strategy 2: Direct Supabase query ───────────────────────────────────
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, slip_reference, status')
        .in('slip_reference', refNumbers)
        .not('status', 'in', '(rejected,cancelled)')
        .limit(1);

      if (!error && data && data.length > 0) {
        const match = data[0];
        return {
          isDuplicate: true,
          existingOrderId: match.id,
          existingCustomer: match.customer_name,
          matchedRef: match.slip_reference,
        };
      }
    } catch (err) {
      console.warn('[slipDuplicateService] Supabase fallback error:', err);
    }
  }

  return empty;
}

/**
 * Analyze a slip image via the FastAPI backend.
 * Returns both OCR result and duplicate check in a single API call.
 * Returns null if the backend is unreachable (caller should fall back to browser OCR).
 *
 * @param {File} imageFile - The slip image file
 * @param {function} [onProgress] - Optional progress callback (0-100)
 * @returns {Promise<{ocr: object, duplicate: object}|null>}
 */
export async function analyzeSlipViaAPI(imageFile, onProgress) {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);

    onProgress?.(10);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for OCR

    const res = await fetch(`${OCR_API_URL}/analyze-slip`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    onProgress?.(90);

    if (!res.ok) {
      console.warn('[slipDuplicateService] analyze-slip returned', res.status);
      return null;
    }

    const result = await res.json();
    onProgress?.(100);
    return result;
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('[slipDuplicateService] FastAPI analyze-slip unavailable:', err.message);
    }
    return null;
  }
}

