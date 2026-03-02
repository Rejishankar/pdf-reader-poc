"""
Global error handlers for the FastAPI application
"""

import os
import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, HTTPException

from .exceptions import (
    ErrorCode,
    PDFProcessingError
)

logger = logging.getLogger(__name__)


async def pdf_processing_error_handler(request: Request, exc: PDFProcessingError):
    """Handle custom PDF processing errors"""
    logger.error(f"PDF Processing Error: {exc.code} - {exc.message}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle FastAPI HTTP exceptions"""
    logger.error(f"HTTP Exception: {exc.status_code} - {exc.detail}")
    
    # Map HTTP status to error code
    error_code_map = {
        400: ErrorCode.VALIDATION_ERROR,
        413: ErrorCode.FILE_TOO_LARGE,
        422: ErrorCode.VALIDATION_ERROR,
        500: ErrorCode.INTERNAL_SERVER_ERROR,
    }
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": error_code_map.get(exc.status_code, ErrorCode.INTERNAL_SERVER_ERROR),
                "message": str(exc.detail),
                "details": None
            }
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    logger.error(f"Validation Error: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": ErrorCode.VALIDATION_ERROR,
                "message": "Request validation failed",
                "details": {"errors": exc.errors()}
            }
        }
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other unexpected exceptions"""
    logger.error(f"Unexpected Error: {type(exc).__name__}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": ErrorCode.INTERNAL_SERVER_ERROR,
                "message": "An unexpected error occurred",
                "details": {
                    "type": type(exc).__name__,
                    "message": str(exc)
                } if os.environ.get("DEBUG") else None
            }
        }
    )


def register_error_handlers(app):
    """Register all error handlers with the FastAPI app"""
    app.add_exception_handler(PDFProcessingError, pdf_processing_error_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
