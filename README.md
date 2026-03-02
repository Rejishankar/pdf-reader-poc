# PDF Reader with AI Extraction

Hey! This is a web app that takes PDFs (even scanned ones) and uses AI to pull out structured data.

## How It Works

The app has two main pieces:
- **Frontend**: Next.js app where you upload PDFs and see results
- **Backend**: Python FastAPI service doing OCR + AI

Here's what happens:
1. Upload a PDF
2. Python extracts text using Tesseract OCR
3. Text goes to Google Gemini AI
4. Gemini figures out the structure and returns clean JSON
5. You get an editable form with all the data

## Getting Started

### Prerequisites

You'll need these installed first:

**On macOS:**
```bash
brew install tesseract poppler
```

### Setup

1. **Python:**
```bash
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

2. **Environment variables:**

Create `.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000
```

3. **Frontend dependencies:**
```bash
npm install
```

4. **Run it:**

Open two terminals:

**Terminal 1 - Python API:**
```bash
./start-python-api.sh
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Head to http://localhost:3000!

## Using the App

Pretty simple:
1. Click "Browse PDF Files" and pick one
2. Wait 10-20 seconds while AI does its thing
3. Edit the form if you need to fix anything
4. Click "Save to File" to download JSON

## The Python API

The backend runs on port 8000 with a modular, production-ready architecture:

### Architecture Highlights

**Modular Design:**
- `gemini_api.py` - Main API endpoints and business logic
- `exceptions.py` - Custom exception classes and error codes
- `error_handlers.py` - Global error handlers for consistent responses

### API Endpoints

### POST /extract-pdf
Send a PDF, get structured JSON back.

**Try it:**
```bash
curl -X POST http://localhost:8000/extract-pdf \
  -F "file=@your-document.pdf"
```

**You'll get:**
```json
{
  "success": true,
  "data": {
    "formType": "type",
    "applicantDetails": {
      "name": "FirstNM LastNM",
      "email": "firstNM@example.com"
    }
  },
  "error": null
}
```

**On error:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Only PDF files are supported",
    "details": {
      "filename": "document.txt",
      "allowed_types": [".pdf"]
    }
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` - Invalid request data
- `FILE_TOO_LARGE` - File exceeds 10MB limit
- `INVALID_FILE_TYPE` - Non-PDF file uploaded
- `OCR_EXTRACTION_FAILED` - OCR processing failed
- `NO_TEXT_EXTRACTED` - No text found in PDF
- `AI_EXTRACTION_FAILED` - Gemini API error
- `AI_TIMEOUT` - AI processing timeout
- `PROCESSING_FAILED` - Unexpected processing error
- `INTERNAL_SERVER_ERROR` - Server error

### GET /health
```bash
curl http://localhost:8000/health
```

### Interactive Docs
Visit http://localhost:8000/docs to play with the API in your browser.

## Testing Just the Python Part

```bash
# Start it up
source .venv/bin/activate
export GEMINI_API_KEY=your_key
python app/api/gemini_api.py
```

Then try these:

**Health check:**
```bash
curl http://localhost:8000/health
```

**Extract a PDF:**
```bash
curl -X POST http://localhost:8000/extract-pdf \
  -F "file=@sample.pdf"
```

**Interactive docs:**
http://localhost:8000/docs


When you upload a PDF:

1. **File Upload** → Frontend sends it to Python API
2. **OCR Magic** → 
   - PDF gets converted to images (one per page)
   - Tesseract reads text from each image
   - All text gets combined
3. **AI Processing** → 
   - Text goes to Gemini 2.5 Flash
   - AI figures out what fields exist and their values
   - Returns structured JSON
4. **Form Generation** → 
   - Frontend creates an interactive form from the JSON
   - You can edit values and validate them
5. **Save** → Export as JSON file

The whole thing uses:
- **React JSON Schema Form** for the editable form
- **Redux** to manage state
- **Material-UI** for nice-looking components
- **Yup** for field validation (emails, phone numbers, etc.)
- **Toast notifications** to keep you informed
- **Structured error handling** with custom exceptions and error codes
- **Python logging module** for comprehensive logging
- **Modular architecture** for maintainability and testability

## Common Issues and Fixes

**"Can't connect to port 8000"**
- Python API isn't running. Start it with `./start-python-api.sh`

**"Tesseract not found"**
```bash
brew install tesseract  
tesseract --version     
```

**"Unable to get page count"**
```bash
brew install poppler    
pdftoppm -h            
```

**"No module named google.genai"**
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

**OCR quality is bad**
- Try better quality scans
- The code uses 300 DPI by default (good enough for most docs)
- You can bump it to 600 DPI if needed (line in `gemini_api.py` in `extract_text_from_pdf_ocr` function)

**"File too large" error**
- Maximum file size is 10MB
- Compress the PDF or split it into smaller files

**Getting validation errors**
- Check the error response for detailed information
- The API returns structured errors with specific error codes and details

## Project Layout

```
pdf-reader-poc/
├── app/
│   ├── api/
│   │   ├── __init__.py           # Package initialization
│   │   ├── gemini_api.py         # Python FastAPI backend (main API)
│   │   ├── exceptions.py         # Custom exceptions and error codes
│   │   └── error_handlers.py    # Global error handlers
│   ├── components/
│   │   ├── PDFViewer.tsx         # Main React component
│   │   ├── FileUploader.tsx      # File upload component
│   │   ├── FormEditor.tsx        # Form editor component
│   │   ├── PDFDisplay.tsx        # PDF display component
│   │   └── ErrorBoundary/        # Error boundary components
│   ├── store/                    # Redux state management
│   │   ├── store.ts
│   │   ├── pdfSlice.ts
│   │   ├── hooks.ts
│   │   └── ReduxProvider.tsx
│   ├── globals.css               # All the styles
│   ├── layout.tsx                # App wrapper
│   └── page.tsx                  # Home page
├── config/
│   └── app.config.ts             # App configuration
├── services/
│   └── pdf.service.ts            # PDF service layer
├── types/
│   └── pdf.types.ts              # TypeScript types
├── utils/
│   ├── errors.ts                 # Error utilities
│   ├── schemaGenerator.ts        # Schema generation
│   └── validation.ts             # Validation utilities
├── .venv/                        # Python environment
├── .env.local                    # Your secrets
├── requirements.txt              # Python packages
├── start-python-api.sh           # Quick start script
├── package.json                  # Node packages
└── README.md                     # This file
```

## What You Need in .env.local

```env
GEMINI_API_KEY=your_api_key_from_google
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000
```

## Development Tips

- **Run both servers** - Frontend needs the Python API to work
- **Check Python terminal** - All OCR/AI errors show up there with structured logging
- **Use FastAPI docs** - http://localhost:8000/docs is great for testing
- **Error responses** - All API errors return structured JSON with error codes and details
- **Logging levels** - Change `level=logging.INFO` to `logging.DEBUG` in `gemini_api.py` for more verbose logs
- **File size limits** - Default is 10MB, configurable in the validation logic
- **Modular code** - Exceptions in `exceptions.py`, error handlers in `error_handlers.py`
