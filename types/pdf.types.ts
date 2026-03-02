/**
 * Type definitions for PDF extraction and form data
 */

export interface ExtractedData {
  [key: string]: string | number | boolean | ExtractedData | ExtractedData[];
}

export interface PDFExtractionRequest {
  file: File;
}

export interface PDFExtractionResponse {
  success: boolean;
  data: ExtractedData;
  error?: string;
}

export interface ValidationRule {
  type: 'email' | 'phone' | 'postal' | 'required' | 'number';
  message: string;
  pattern?: RegExp;
}

export interface FormField {
  name: string;
  value: any;
  type: string;
  validations: ValidationRule[];
}

export interface PDFFile {
  file: File;
  url: string;
  name: string;
  size: number;
}

export interface FormValidationError {
  field: string;
  message: string;
}
