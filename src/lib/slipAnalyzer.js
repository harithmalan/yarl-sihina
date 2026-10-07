/**
 * slipAnalyzer.js
 * Browser-side OCR using Tesseract.js for bank slip analysis.
 * Extracts reference number, beneficiary name, amount, and date
 * from Sri Lankan bank payment slips (ComBank, BOC, HNB, Frimi).
 *
 * Handles three slip types:
 *  1. Online transfer receipts (screenshots from banking apps)
 *  2. ATM/CDM machine printed receipts (thermal paper photos)
 *  3. Bank teller/counter receipts (handwritten or printed)
 */
import { createWorker } from 'tesseract.js';

// ── Regex patterns for Sri Lankan bank slips ──────────────────────────────

const REF_PATTERNS = [
  // ComBank patterns (COMM-, COMM TRX, FT prefix)
  /(?:COMM?[-\s]?(?:TRX|FT|REF)?[-\s]?)([A-Z0-9]{4,12})/gi,
  // BOC patterns
  /(?:BOC[-\s]?(?:FT|REF)?[-\s]?)([A-Z0-9]{4,12})/gi,
  // HNB patterns
  /(?:HNB[-\s]?(?:ONLINE|REF|FT)?[-\s]?)([A-Z0-9]{4,12})/gi,
  // Other banks
  /(?:SAMPATH|FRIMI|NDB|DFCC)[-\s]?(?:REF|TRX|FT)?[-\s]?([A-Z0-9]{4,12})/gi,
  // Generic reference label
  /(?:reference|ref(?:erence)?|transaction|txn|trx|slip\s*no|voucher)[:\s#]+([A-Z0-9\-]{5,20})/gi,
  // FT prefix (common in ComBank/BOC online transfers)
  /\bFT([0-9]{8,12})\b/g,
  // Purely numeric long refs (ATM/CDM receipts)
  /\b(\d{10,14})\b/g,
  /\b(\d{8,9})\b/g,
];

const BENEFICIARY_PATTERNS = [
  /(?:beneficiary|payee|account\s*name|credit(?:ed)?\s*to|to\s*account|to)[:\s]+([A-Za-z][A-Za-z\s]{2,40})/gi,
  /(?:YARL\s*SIHINA(?:\s+[A-Za-z]+)*)/gi,
];

const AMOUNT_PATTERNS = [
  /(?:LKR|Rs\.?|SLR|amount)[:\s]*([,\d]+(?:\.\d{1,2})?)/gi,
  /([,\d]+(?:\.\d{2}))\s*(?:LKR|Rs)/gi,
];

const DATE_PATTERNS = [
  /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
  /(\d{4}-\d{2}-\d{2})/g,
  /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/gi,
];

/**
 * Score a reference number's likely authenticity for a Sri Lankan bank slip.
 * @param {string} ref - Reference number string
 * @returns {number} Confidence score between 0 and 1
 */
function scoreRef(ref) {
  if (/^(COMM?|BOC|HNB|SAMPATH|FRIMI|NDB|DFCC)/i.test(ref)) return 0.9;
  if (/^FT\d{6,}/i.test(ref)) return 0.85;
  if (/^[A-Z]+-[A-Z0-9]+/i.test(ref)) return 0.75;
  if (/^[A-Z]{2,}[0-9]{4,}/i.test(ref)) return 0.65;
  if (/^\d{10,14}$/.test(ref)) return 0.45;
  if (/^\d{8,9}$/.test(ref)) return 0.35;
  return 0.3;
}

/**
 * Extract all unique regex matches from text, return sorted by confidence.
 * @param {string} text - OCR raw text
 * @param {RegExp[]} patterns - Array of regex patterns
 * @returns {string[]} Unique extracted values
 */
function extractAll(text, patterns) {
  const results = new Map(); // value → score
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[1] || match[0];
      const val = raw.trim().toUpperCase();
      if (val.length >= 3 && !results.has(val)) {
        results.set(val, scoreRef(val));
      }
    }
  }
  // Sort by score descending
  return [...results.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([v]) => v);
}

/**
 * Parse OCR text and return structured slip field data.
 * @param {string} rawText - Raw text string from Tesseract OCR
 * @returns {{ref_number: string|null, beneficiary_name: string|null, amount: string|null, date: string|null, confidence: number, all_refs: string[], raw_text: string}}
 */
export function parseSlipText(rawText) {
  const text = rawText || '';

  const allRefs = extractAll(text, REF_PATTERNS);
  const bestRef = allRefs[0] || null;
  const confidence = bestRef ? scoreRef(bestRef) : 0.1;

  // Beneficiary name — find first plausible name
  const beneficiaryMatches = extractAll(text, BENEFICIARY_PATTERNS);
  const beneficiaryName =
    beneficiaryMatches.find(
      (n) => n.length > 2 && !/^(TO|FROM|DATE|BANK|REF|THE|AND)$/i.test(n)
    ) || null;

  // Amount
  const amounts = extractAll(text, AMOUNT_PATTERNS);
  const amount = amounts[0]?.replace(/,/g, '') || null;

  // Date
  const dates = extractAll(text, DATE_PATTERNS);
  const date = dates[0] || null;

  return {
    ref_number: bestRef,
    beneficiary_name: beneficiaryName,
    amount,
    date,
    confidence,
    all_refs: allRefs,
    raw_text: text.slice(0, 2000), // truncate for safety
  };
}

/**
 * Run Tesseract.js OCR on a slip image (File object or data URL).
 * Falls back gracefully if Tesseract fails to load.
 *
 * @param {File|string} imageSource - File object or base64 data URL
 * @param {function} [onProgress] - Optional progress callback (0-100)
 * @returns {Promise<{ref_number: string|null, beneficiary_name: string|null, amount: string|null, date: string|null, confidence: number, all_refs: string[], raw_text: string}>}
 */
export async function analyzeSlipImage(imageSource, onProgress) {
  let worker = null;
  try {
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    await worker.setParameters({
      // Allow common alphanumeric chars found on bank slips
      tessedit_char_whitelist:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:-/()\n',
      preserve_interword_spaces: '1',
    });

    const {
      data: { text },
    } = await worker.recognize(imageSource);

    return parseSlipText(text);
  } catch (err) {
    console.error('[slipAnalyzer] Tesseract error:', err);
    throw err;
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (_) {
        // ignore termination errors
      }
    }
  }
}

