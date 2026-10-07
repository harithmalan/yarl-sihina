"""
main.py
FastAPI microservice for bank slip OCR and duplicate reference detection.
Endpoints:
  GET  /health           — liveness probe
  POST /analyze-slip     — OCR + duplicate check (multipart image upload)
  POST /check-duplicate  — duplicate check only (JSON ref list)
"""
import os
import io
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image
from dotenv import load_dotenv
import pytesseract

from ocr_engine import run_ocr
from duplicate_checker import check_duplicate

load_dotenv()

# ── CORS origins ──────────────────────────────────────────────────────────
# Set ALLOWED_ORIGINS env var in Railway to restrict this.
# Defaults include the Vercel production URL and local dev servers.
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "https://yarl-sihina.vercel.app,http://localhost:5173,http://localhost:3000"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: log Tesseract version to confirm installation."""
    try:
        version = pytesseract.get_tesseract_version()
        print(f"[slip-ocr-service] Tesseract version: {version}")
    except Exception as e:
        print(f"[slip-ocr-service] WARNING — Tesseract not found: {e}")
        print("  On Windows: download from https://github.com/UB-Mannheim/tesseract/wiki")
        print("  Then set TESSERACT_CMD=C:\\\\Program Files\\\\Tesseract-OCR\\\\tesseract.exe in .env")
    yield


app = FastAPI(
    title="YARL SIHINA Slip OCR Service",
    description="OCR microservice for bank payment slip analysis and duplicate detection",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ───────────────────────────────────────────────────────

class DuplicateCheckRequest(BaseModel):
    ref_numbers: list[str]


# ── Routes ───────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    """Liveness probe."""
    return {"status": "ok", "service": "slip-ocr-service", "version": "1.0.0"}


@app.post("/analyze-slip")
async def analyze_slip(file: UploadFile = File(...)):
    """
    Accept a bank slip image, run OCR, and check for duplicate reference numbers.

    Returns OCR extracted fields + duplicate check result.
    """
    # Validate content type
    allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"}
    ct = (file.content_type or "").lower()
    if ct not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ct}'. Allowed: JPEG, PNG, WEBP, HEIC."
        )

    try:
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:  # 10 MB guard
            raise HTTPException(status_code=400, detail="File too large. Maximum 10 MB.")

        pil_image = Image.open(io.BytesIO(contents))
        pil_image = pil_image.convert("RGB")

        # Run OCR
        ocr_result = run_ocr(pil_image)

        # Duplicate check using all candidate refs
        dup_result = check_duplicate(ocr_result.get("all_refs", []))

        return JSONResponse(content={
            "success": True,
            "ocr": ocr_result,
            "duplicate": dup_result,
        })

    except HTTPException:
        raise
    except Exception as e:
        print(f"[analyze-slip] Error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@app.post("/check-duplicate")
async def check_duplicate_refs(body: DuplicateCheckRequest):
    """
    Check if any of the given reference numbers already exist in the orders table.
    """
    try:
        result = check_duplicate(body.ref_numbers)
        return JSONResponse(content=result)
    except Exception as e:
        print(f"[check-duplicate] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Duplicate check failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
