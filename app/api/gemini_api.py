#!/usr/bin/env python3
"""
Exposes PDF form extraction as a REST API 
"""

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import os
import json
import tempfile
import asyncio
from typing import Dict, Any, Optional
import uvicorn
import logging

from pdf2image import convert_from_path
import pytesseract
from google import genai
import re

from .exceptions import (
    ErrorCode,
    ErrorDetail,
    PDFProcessingError,
    OCRError,
    AIExtractionError,
    ValidationError
)
from .error_handlers import register_error_handlers

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="PDF OCR and Gemini LLM Service")

# Register error handlers
register_error_handlers(app)

# Enable CORS for frontend integration
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
# Support multiple origins (comma-separated)
allowed_origins = [origin.strip() for origin in FRONTEND_URL.split(",")] if FRONTEND_URL else ["*"]
logger.info(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini client
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")

client = genai.Client(api_key=GEMINI_API_KEY)

# Response Models
class LLMResponse(BaseModel):
    success: bool
    data: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[ErrorDetail] = None


# Helper Functions
def clean_text(text: str) -> str:
    """Clean and normalize extracted text"""
    try:
        if not text:
            return ""
        return " ".join(text.split())
    except Exception as e:
        logger.error(f"Error in clean_text: {type(e).__name__}: {e}")
        raise PDFProcessingError(
            code=ErrorCode.PROCESSING_FAILED,
            message="Failed to clean extracted text",
            details={"error": str(e)}
        )

def extract_text_from_pdf_ocr(pdf_path: str) -> str:
    """Extract text from PDF using OCR"""
    try:
        logger.info(f"Converting text from PDF: {pdf_path}")
        
        # Validate file exists
        if not os.path.exists(pdf_path):
            raise OCRError(
                code=ErrorCode.OCR_EXTRACTION_FAILED,
                message="PDF file not found",
                details={"path": pdf_path}
            )
        
        images = convert_from_path(pdf_path, dpi=300)
        
        if not images:
            raise OCRError(
                code=ErrorCode.OCR_EXTRACTION_FAILED,
                message="Failed to convert PDF to images",
                details={"path": pdf_path}
            )
        
        ocr_text = ""
        for img in images:
            ocr_text += pytesseract.image_to_string(img) + "\n"
        
        cleaned_text = clean_text(ocr_text)
        
        if not cleaned_text or len(cleaned_text.strip()) < 10:
            raise OCRError(
                code=ErrorCode.NO_TEXT_EXTRACTED,
                message="No meaningful text could be extracted from the PDF",
                details={"extracted_length": len(cleaned_text)}
            )
        
        return cleaned_text

    except OCRError:
        raise
    except Exception as e:
        logger.error(f"Error in extract_text_from_pdf_ocr: {type(e).__name__}: {e}", exc_info=True)
        raise OCRError(
            code=ErrorCode.OCR_EXTRACTION_FAILED,
            message=f"OCR extraction failed: {str(e)}",
            details={"error_type": type(e).__name__}
        )
    
def extract_structured_data_with_gemini(text: str, custom_prompt: Optional[str] = None) -> Dict[str, Any]:
    """Extract structured data from text using Gemini AI"""
    logger.info("Sending text to Gemini for structured extraction...")
    
    default_prompt = """You are a PDF form data extraction assistant. Analyze the provided text from a scanned form and extract all relevant fields and their values into a structured JSON object with the actual data values.

Rules:
1. Extract all field labels and their corresponding values from the form
2. Group related fields into nested objects (e.g., "applicantDetails", "contactInfo", "serviceRequest")
3. Use descriptive field names in camelCase
4. For checkboxes/radio buttons, use boolean values (true/false) or the selected option as a string
5. Extract dates as strings in the format found in the document
6. Extract numbers as numbers (not strings) when they represent quantities, amounts, etc.
7. Return ONLY the actual data values extracted from the form, NOT a JSON Schema
8. Create a hierarchical structure that reflects the form's organization
9. Do not hallucinate data - only extract what is clearly present in the text
10. If a field is empty or unclear, you can omit it or set it to null

Example format for extracted data (NOT a schema):
{
  "formType": "ATM Card Application",
  "applicantDetails": {
    "fullName": "Ramaiah M",
    "dateOfBirth": "1985-06-12",
    "nationalId": "123456789"
  },
  "contactInfo": {
    "phoneNumber": "+1234567890",
    "email": "ramaiahm@example.com",
    "address": "123 Main Street"
  },
  "serviceRequest": {
    "requestATMCard": true,
    "requestMobileBanking": false,
    "requestSMS": true
  }
}

Now extract the actual field values from this text:

"""
    
    prompt = custom_prompt if custom_prompt else default_prompt
    full_prompt = f"{prompt}\n\n{text[:15000]}"
    
    logger.info(f"Sending prompt to Gemini (text length: {len(text[:15000])} chars)")
    
    try:
        logger.debug("Calling Gemini API...")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt
        )
        logger.info("Received response from Gemini")
        
        # Extract JSON from response
        response_text = response.text.strip()
        logger.debug(f"Response text length: {len(response_text)} chars")
        
        # Try to find JSON in the response
        if response_text.startswith('{'):
            extracted_data = json.loads(response_text)
        else:
            # Try to extract JSON from markdown code blocks
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL)
            if json_match:
                extracted_data = json.loads(json_match.group(1))
            else:
                # Return as raw text if can't parse
                logger.warning("Could not parse JSON from Gemini response")
                extracted_data = {"rawResponse": response_text}
        
        return extracted_data
        
    except asyncio.TimeoutError:
        logger.error("Gemini API call timed out after 60 seconds")
        raise AIExtractionError(
            code=ErrorCode.AI_TIMEOUT,
            message="AI extraction timed out",
            details={"timeout_seconds": 60}
        )
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from Gemini response: {e}")
        raise AIExtractionError(
            code=ErrorCode.AI_EXTRACTION_FAILED,
            message="Failed to parse AI response as JSON",
            details={"error": str(e)}
        )
    except Exception as e:
        logger.error(f"Error in Gemini extraction: {type(e).__name__}: {e}", exc_info=True)
        raise AIExtractionError(
            code=ErrorCode.AI_EXTRACTION_FAILED,
            message=f"AI extraction failed: {str(e)}",
            details={"error_type": type(e).__name__}
        )


@app.get("/health")
async def root():
    """Health check endpoint"""
    try:
        return {
            "status": "ok",
            "service": "PDF OCR and Gemini LLM API",
            "endpoints": {
                "POST /extract-pdf": "Extract and process PDF with OCR + Gemini"
            }
        }
    except Exception as e:
        logger.error(f"Error in health check: {type(e).__name__}: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


@app.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)) -> LLMResponse:
 
    logger.info(f"Calling extract_pdf service for file: {file.filename}")
    
    # Validate file type
    if not file.filename or not file.filename.endswith('.pdf'):
        raise ValidationError(
            code=ErrorCode.INVALID_FILE_TYPE,
            message="Only PDF files are supported",
            details={"filename": file.filename, "allowed_types": [".pdf"]}
        )
    
    # Validate file size (10MB limit)
    content = await file.read()
    file_size = len(content)
    max_size = 10 * 1024 * 1024  # 10MB
    
    if file_size > max_size:
        raise ValidationError(
            code=ErrorCode.FILE_TOO_LARGE,
            message=f"File too large. Maximum size is {max_size // (1024*1024)}MB",
            details={
                "file_size_bytes": file_size,
                "max_size_bytes": max_size,
                "file_size_mb": round(file_size / (1024*1024), 2)
            }
        )
    
    logger.info(f"File validated: {file.filename} ({round(file_size / 1024, 2)} KB)")
    
    temp_file_path = None
    
    try:
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        logger.info(f"Saved uploaded PDF to temporary path: {temp_file_path}")
        
        # Extract text using OCR
        extracted_text = extract_text_from_pdf_ocr(temp_file_path)
        logger.info(f"Extracted text length: {len(extracted_text)} characters")
        logger.debug(f"Extracted text sample: {extracted_text[:200]}...")
        
        # Process with Gemini
        structured_data = extract_structured_data_with_gemini(extracted_text)
        logger.info(f"Successfully extracted structured data with {len(structured_data)} top-level fields")
        
        return LLMResponse(
            success=True,
            data=structured_data,
            error=None
        )
        
    except (ValidationError, OCRError, AIExtractionError):
        # Re-raise custom errors to be handled by exception handlers
        raise
        
    except Exception as e:
        logger.error(f"Unexpected error processing PDF: {type(e).__name__}: {e}", exc_info=True)
        raise PDFProcessingError(
            code=ErrorCode.PROCESSING_FAILED,
            message="An unexpected error occurred while processing the PDF",
            details={
                "error_type": type(e).__name__,
                "error_message": str(e)
            }
        )
    
    finally:
        # Clean up temp file
        if temp_file_path:
            try:
                os.unlink(temp_file_path)
                logger.debug(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as e:
                logger.warning(f"Failed to clean up temp file {temp_file_path}: {e}")


if __name__ == "__main__":
    
    logger.info("Starting Gemini LLM API Service...")
    logger.info("API will be available at: http://localhost:8000")
    logger.info("Documentation at: http://localhost:8000/docs")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
