#!/usr/bin/env python3
"""
Exposes PDF form extraction as a REST API 
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import tempfile
import asyncio
from typing import Dict, Any, Optional
import uvicorn

from pdf2image import convert_from_path
import pytesseract
from google import genai
import re

# Initialize FastAPI app
app = FastAPI(title="PDF OCR and Gemini LLM Service")

# Enable CORS for frontend integration
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini client
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")

client = genai.Client(api_key=GEMINI_API_KEY)

class LLMResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    error: Optional[str] = None


def clean_text(text: str) -> str:
    try:
        return " ".join(text.split())
    except Exception as e:
        print(f"ERROR in clean_text: {type(e).__name__}: {e}")
        return text if text else ""

def extract_text_from_pdf_ocr(pdf_path: str) -> str:
    try:
        print(f"Converting text from PDF: {pdf_path}")
        
        images = convert_from_path(pdf_path, dpi=300)
        ocr_text = ""

        for img in images:
            ocr_text += pytesseract.image_to_string(img) + "\n"
        
        return clean_text(ocr_text)

    except Exception as e:
        print(f"ERROR in extract_text_from_pdf_ocr: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {str(e)}")
    
def extract_structured_data_with_gemini(text: str, custom_prompt: Optional[str] = None) -> Dict[str, Any]:
   
    print("Sending text to Gemini for structured extraction...")
    
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
    
    print(f"Sending prompt to Gemini (text length: {len(text[:15000])} chars)")
    
    try:
      
        print("Calling Gemini API...")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt
        ) 
        # , config={'http_options': {'timeout': 60}}    # Add timeout to prevent hanging
        print("Received response from Gemini")
        
        # Extract JSON from response
        response_text = response.text.strip()
        print(f"Response text length: {len(response_text)} chars")
        
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
                extracted_data = {"rawResponse": response_text}
        
        return extracted_data
        
    except asyncio.TimeoutError:
        print("ERROR: Gemini API call timed out after 60 seconds")
        return {"error": "API timeout - request took too long"}
    except Exception as e:
        print(f"ERROR in Gemini extraction: {type(e).__name__}: {e}")
        return {"error": str(e)}


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
        print(f"ERROR in health check: {type(e).__name__}: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


@app.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)) -> LLMResponse:

    print("calling extract_pdf service ...", file.filename)
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    temp_file = None
    
    try:
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        print(f"Saved uploaded PDF to temporary path: {temp_file_path}")
        # Extract text using OCR
        extracted_text = extract_text_from_pdf_ocr(temp_file_path)
        
        print(f"Extracted text length: {len(extracted_text)} characters")

        if not extracted_text or len(extracted_text.strip()) < 10:
            return LLMResponse(
                success=False,
                data={},
                error="No text could be extracted from the PDF."
            )
        
        # Process with Gemini
        structured_data = extract_structured_data_with_gemini(extracted_text)
        
        # Check if Gemini returned an error
        if "error" in structured_data and len(structured_data) == 1:
            print(f"Gemini extraction failed with error: {structured_data['error']}")
            return LLMResponse(
                success=False,
                data={},
                error=f"AI extraction failed: {structured_data['error']}"
            )
        
        print(f"Extracted structured data: {json.dumps(structured_data)[:500]}...")
        
        return LLMResponse(
            success=True,
            data=structured_data
        )
        
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return LLMResponse(
            success=False,
            data={},
            error=f"Processing failed: {str(e)}"
        )
    
    finally:
        # Clean up temp file
        if temp_file:
            try:
                os.unlink(temp_file_path)
            except:
                pass


if __name__ == "__main__":
    
    print("Starting Gemini LLM API Service...")
    print(f"API will be available at: http://localhost:8000")
    print(f"Documentation at: http://localhost:8000/docs")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
