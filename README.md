# Development Approach & Architecture

## Setup Instructions

### Prerequisites
- Node.js 24+ and npm
- Python 3.9+
- Tesseract OCR and Poppler utilities
- Google Gemini API key

### Installation

**1. Install system dependencies (macOS):**
```bash
brew install tesseract poppler
```

**2. Set up Python environment:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**3. Install frontend dependencies:**
```bash
npm install
```

**4. Configure environment variables:**

Create `.env.local` in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000
```

**5. Run the application:**

Open two terminal windows:

**Terminal 1 - Backend API:**
```bash
./start-python-api.sh
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Access the app at http://localhost:3000

### GET /health
```bash
curl http://localhost:8000/health
```

### Interactive Docs
Visit http://localhost:8000/docs to play with the API in your browser.

---
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


## Technical Approach

### Problem Statement
Extract structured data from PDF documents (including scanned/image-based PDFs) and present it in an editable form interface.

### Solution Architecture

**Two-tier architecture:**
- **Backend (Python/FastAPI):** Handles heavy processing (OCR, AI extraction)
- **Frontend (Next.js/React):** Provides user interface and form editing

### Key Technical Decisions

**1. OCR with Tesseract**
- **Why:** Open-source, reliable, handles scanned PDFs
- **How:** Convert PDF pages to images --> Run OCR per page --> Combine text

**2. AI Processing with Gemini**
- **Why:** Better at understanding document structure
- **How:** Send extracted text with prompt --> Get structured JSON back

**3. Dynamic Form Generation**
- **Why:** Unknown form structure until extraction completes
- **How:** Generate JSON Schema from extracted data --> Render with RJSF

**4. Client-side Processing**
- **Why:** Minimize backend complexity, better UX
- **How:** Frontend handles form state, validation, and file downloads

### Approach

```
User uploads PDF
    |
Frontend sends to /extract-pdf endpoint
    |
Backend: PDF --> Images (poppler --> pdf2image)
    |
Backend: Images --> Text (Tesseract OCR)
    |
Backend: Text --> Structured JSON (Gemini AI)
    |
Frontend: JSON --> JSON Schema + Yup validation
    |
Frontend: Render editable form (RJSF)
    |
User edits and saves as JSON file
```

---

## State Management Strategy

### Global State (Redux Toolkit)

**Why Redux?**
- Complex state shared across multiple components and state updates with actions
- Easy to test and maintain

**State Structure:**
```typescript
{
  pdf: {
    file: File | null,              // Uploaded PDF file
    pdfUrl: string,                 // Blob URL for PDF viewer
    error: string,                  // Error messages
    extractedData: ExtractedData,   // Raw API response
    isExtracting: boolean,          // Loading state
    formData: FormDataObject,       // Transformed form data
    jsonSchema: RJSFSchema          // Generated schema
  }
}
```

**Key Design Decisions:**

**1. Single Slice Pattern**
- All PDF-related state in one slice (`pdfReducer.ts`)
- **Benefit:** Easier to reason about state changes

**2. Separate Raw and Transformed Data**
- `extractedData`: Original API response
- `formData`: Transformed for form rendering
- **Benefit:** Can regenerate form without re-fetching

**3. Synchronous Actions Only**
- API calls in component layer
- Keep state management simple
- **Benefit:** Clear separation: components handle I/O, Redux handles state

**4. Reset Pattern**
- `resetPDFState` action restarts workflow
- **Benefit:** Clean slate without page refresh

### Local Component State

**Used for:**
- UI-only state (dialogs, loading indicators)
- Form validation schema (Yup)
- Temporary state (file processing flags)

**Why not in Redux?**
- Doesn't need to be shared
- Component-scoped lifecycle
- Simpler to manage locally

### State Update Flow

```
User Action
    |
Component dispatches Redux action
    |
Redux reducer updates state
    |
Connected components re-render
    |
UI reflects new state
```
---
