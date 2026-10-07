"""
ocr_engine.py
OCR engine for Sri Lankan bank payment slips.
Uses pytesseract + OpenCV preprocessing + regex field extraction.
"""
import re
import os
from typing import Optional
import numpy as np
from PIL import Image
import pytesseract
import cv2

# Allow overriding Tesseract path via env (needed on Windows)
_tess_cmd = os.getenv("TESSERACT_CMD", "")
if _tess_cmd:
    pytesseract.pytesseract.tesseract_cmd = _tess_cmd


# ── Regex patterns for Sri Lankan bank slip fields ────────────────────────

REF_PATTERNS: list[tuple[str, float]] = [
    # Named-bank patterns with high confidence
    (r'(?:COMM?[-\s]?(?:TRX|FT|REF)?[-\s]?)([A-Z0-9]{4,12})', 0.9),
    (r'(?:BOC[-\s]?(?:FT|REF)?[-\s]?)([A-Z0-9]{4,12})', 0.9),
    (r'(?:HNB[-\s]?(?:ONLINE|REF|FT)?[-\s]?)([A-Z0-9]{4,12})', 0.9),
    (r'(?:SAMPATH|FRIMI|NDB|DFCC)[-\s]?(?:REF|TRX|FT)?[-\s]?([A-Z0-9]{4,12})', 0.85),
    # Generic reference label
    (r'(?:reference|ref(?:erence)?|transaction|txn|trx|slip\s*no|voucher)[:\s#]+([A-Z0-9\-]{5,20})', 0.75),
    # FT prefix (common in ComBank/BOC online)
    (r'\bFT([0-9]{8,12})\b', 0.8),
    # Purely numeric long refs
    (r'\b(\d{10,14})\b', 0.45),
    (r'\b(\d{8,9})\b', 0.35),
]

BENEFICIARY_PATTERNS: list[str] = [
    r'(?:beneficiary|payee|account\s*name|credit(?:ed)?\s*to|to\s*account|to)[:\s]+([A-Za-z][A-Za-z\s]{2,40})',
    r'(?:YARL\s*SIHINA(?:\s+[A-Za-z]+)*)',
]

AMOUNT_PATTERNS: list[str] = [
    r'(?:LKR|Rs\.?|SLR|amount)[\s:]*([\d,]+(?:\.\d{1,2})?)',
    r'([\d,]+(?:\.\d{2}))\s*(?:LKR|Rs)',
]

DATE_PATTERNS: list[str] = [
    r'(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})',
    r'(\d{4}-\d{2}-\d{2})',
    r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})',
]


def preprocess_image(pil_image: Image.Image) -> np.ndarray:
    """Convert PIL image to preprocessed numpy array optimised for OCR."""
    img = np.array(pil_image.convert("RGB"))
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

    # Adaptive threshold handles varying lighting across slip types
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31, 10
    )

    # Mild sharpening kernel
    kernel = np.array([[0, -0.5, 0], [-0.5, 3, -0.5], [0, -0.5, 0]])
    sharpened = cv2.filter2D(thresh, -1, kernel)

    # Upscale if too small (helps Tesseract accuracy on tiny thermal prints)
    h, w = sharpened.shape
    if w < 800:
        scale = 800 / w
        sharpened = cv2.resize(sharpened, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    return sharpened


def _extract_refs(text: str) -> list[tuple[str, float]]:
    """Return (ref_value, confidence) pairs, sorted by confidence desc."""
    found: dict[str, float] = {}
    upper_text = text.upper()

    for pattern, conf in REF_PATTERNS:
        for m in re.finditer(pattern, upper_text, re.IGNORECASE):
            val = (m.group(1) if m.lastindex and m.lastindex >= 1 else m.group(0)).strip()
            if len(val) >= 4 and val not in found:
                found[val] = conf

    return sorted(found.items(), key=lambda x: x[1], reverse=True)


def _extract_first(text: str, patterns: list[str]) -> Optional[str]:
    """Extract first match from a list of regex patterns."""
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            val = m.group(1).strip() if m.lastindex and m.lastindex >= 1 else m.group(0).strip()
            if len(val) >= 2:
                return val
    return None


def extract_slip_fields(raw_text: str) -> dict:
    """
    Parse raw OCR text and return structured slip data.
    
    Returns:
        dict with keys: ref_number, beneficiary_name, amount, date,
                        confidence, all_refs, raw_text
    """
    refs = _extract_refs(raw_text)
    best_ref, best_conf = refs[0] if refs else (None, 0.1)

    beneficiary = _extract_first(raw_text, BENEFICIARY_PATTERNS)
    if beneficiary:
        # Clean up common OCR noise
        beneficiary = re.sub(r'\s+', ' ', beneficiary).strip()[:50]

    amount = _extract_first(raw_text, AMOUNT_PATTERNS)
    if amount:
        amount = amount.replace(',', '').strip()

    date = _extract_first(raw_text, DATE_PATTERNS)

    return {
        "ref_number": best_ref,
        "beneficiary_name": beneficiary,
        "amount": amount,
        "date": date,
        "confidence": best_conf,
        "all_refs": [r for r, _ in refs],
        "raw_text": raw_text[:2000],  # truncate for safety
    }


def run_ocr(pil_image: Image.Image) -> dict:
    """
    Full OCR pipeline: preprocess → Tesseract → field extraction.
    
    Args:
        pil_image: PIL Image object of the bank slip
        
    Returns:
        dict with extracted slip fields and confidence score
    """
    processed = preprocess_image(pil_image)
    processed_pil = Image.fromarray(processed)

    config = '--oem 3 --psm 6 -l eng'
    raw_text = pytesseract.image_to_string(processed_pil, config=config)

    return extract_slip_fields(raw_text)
