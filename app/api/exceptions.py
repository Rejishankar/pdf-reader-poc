"""
Custom exceptions for PDF processing API
"""

from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ErrorCode(str, Enum):
    """Standardized error codes"""
    VALIDATION_ERROR = "VALIDATION_ERROR"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    OCR_EXTRACTION_FAILED = "OCR_EXTRACTION_FAILED"
    NO_TEXT_EXTRACTED = "NO_TEXT_EXTRACTED"
    AI_EXTRACTION_FAILED = "AI_EXTRACTION_FAILED"
    AI_TIMEOUT = "AI_TIMEOUT"
    PROCESSING_FAILED = "PROCESSING_FAILED"
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"


class ErrorDetail(BaseModel):
    """Detailed error information"""
    code: ErrorCode
    message: str
    field: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Structured error response"""
    success: bool = False
    error: ErrorDetail
    timestamp: Optional[str] = None
    request_id: Optional[str] = None


class PDFProcessingError(Exception):
    """Base exception for PDF processing errors"""
    def __init__(self, code: ErrorCode, message: str, details: Optional[Dict[str, Any]] = None):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(self.message)


class OCRError(PDFProcessingError):
    """OCR-specific errors"""
    pass


class AIExtractionError(PDFProcessingError):
    """AI extraction-specific errors"""
    pass


class ValidationError(PDFProcessingError):
    """Validation-specific errors"""
    pass
