/**
 * Custom Error Classes for PDF Processing
 */

export class PDFError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PDFError';
    Object.setPrototypeOf(this, PDFError.prototype);
  }
}

export class PDFValidationError extends PDFError {
  constructor(message: string, details?: any) {
    super(message, 'PDF_VALIDATION_ERROR', details);
    this.name = 'PDFValidationError';
  }
}

export class PDFExtractionError extends PDFError {
  constructor(message: string, details?: any) {
    super(message, 'PDF_EXTRACTION_ERROR', details);
    this.name = 'PDFExtractionError';
  }
}

export class PDFFileSizeError extends PDFValidationError {
  constructor(actualSize: number, maxSize: number) {
    const actualSizeMB = (actualSize / 1024 / 1024).toFixed(2);
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2);
    super(
      `File size (${actualSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
      { actualSize, maxSize, actualSizeMB, maxSizeMB }
    );
    this.name = 'PDFFileSizeError';
  }
}

export class PDFFileTypeError extends PDFValidationError {
  constructor(fileName: string, extension: string) {
    super(
      `Invalid file type. Only PDF files (.pdf) are allowed. File "${fileName}" has extension "${extension}"`,
      { fileName, extension }
    );
    this.name = 'PDFFileTypeError';
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
    Object.setPrototypeOf(this, APIError.prototype);
  }
}


//Error Handler Utility
export class ErrorHandler {
  static handle(error: unknown): string {
    if (error instanceof PDFError) {
      return error.message;
    }
    
    if (error instanceof APIError) {
      return `API Error (${error.status}): ${error.message}`;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unknown error occurred';
  }

  static log(error: unknown): void {
    console.error('[ErrorHandler]', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
