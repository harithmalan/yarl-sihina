# YARL SIHINA — Slip OCR Microservice

FastAPI microservice that analyses bank payment slip images using Tesseract OCR and detects duplicate submissions.

## Prerequisites

### Install Tesseract OCR

**Windows:**
1. Download the installer from [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki)
2. Install to default path: `C:\Program Files\Tesseract-OCR\`
3. Add to `.env`: `TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe`

**Linux / Docker:**
```bash
apt-get install tesseract-ocr tesseract-ocr-eng
```

**macOS:**
```bash
brew install tesseract
```

## Setup

```bash
cd slip-ocr-service
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase credentials and Tesseract path
```

## Run (Development)

```bash
uvicorn main:app --port 8001 --reload
```

## Run with Docker

```bash
docker build -t yarl-slip-ocr .
docker run -p 8001:8001 --env-file .env yarl-slip-ocr
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| POST | `/analyze-slip` | Upload slip image → OCR + duplicate check |
| POST | `/check-duplicate` | JSON body `{ref_numbers: [...]}` → duplicate check only |

### Example: analyze-slip

```bash
curl -X POST http://localhost:8001/analyze-slip \
  -F "file=@slip.jpg"
```

### Example: check-duplicate

```bash
curl -X POST http://localhost:8001/check-duplicate \
  -H "Content-Type: application/json" \
  -d '{"ref_numbers": ["COMM-TRX-99824"]}'
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (not anon key) |
| `TESSERACT_CMD` | Path to tesseract binary (Windows only) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |

## Slip Types Supported

- **Online transfer receipts** (Frimi, ComBank app, BOC app screenshots)
- **ATM/CDM machine printed receipts** (thermal paper photos)
- **Bank teller/counter receipts** (handwritten or printed)

## Notes

- The service gracefully falls back if Supabase is not configured (duplicate check returns `is_duplicate: false`)
- The React frontend falls back to browser-side Tesseract.js if this service is unavailable
