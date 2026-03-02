/**
 * PDF Service - Handles all PDF-related API calls
 */

import config from '../config/app.config';
import { PDFExtractionResponse } from '../types/pdf.types';
import { APIError, PDFExtractionError, ErrorHandler } from '../utils/errors';

export class PDFService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = config.api.baseUrl;
    this.timeout = config.api.timeout;
  }

  /**
   * Extract data from PDF file
   */
  async extractPDFData(file: File): Promise<PDFExtractionResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/extract-pdf`, {
        method: 'POST',
        body: formData,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      const buildMessage = (err: any) => {
        if (!err) return '';
        if (typeof err === 'string') return err;
        if (err.message && typeof err.message === 'string') return err.message;
        try {
          return JSON.stringify(err);
        } catch {
          return String(err);
        }
      };

      if (!response.ok) {
        const errMsg = buildMessage(result.error) || 'Failed to extract data';
        throw new APIError(errMsg, response.status, result);
      }

      if (result.success === false) {
        const errMsg = buildMessage(result.error) || 'AI extraction failed';
        throw new PDFExtractionError(errMsg, result);
      }

      return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new PDFExtractionError('Request timed out. Please try again.');
      }

      ErrorHandler.log(error);
      throw error;
    }
  }

  /**
   * Transform single-element arrays to strings
   */
  static transformArraysToStrings(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      if (data.length === 1 && typeof data[0] === 'string') {
        return data[0];
      }
      return data.map((item) => PDFService.transformArraysToStrings(item));
    }

    if (typeof data === 'object') {
      const transformed: any = {};
      for (const key in data) {
        transformed[key] = PDFService.transformArraysToStrings(data[key]);
      }
      return transformed;
    }

    return data;
  }
}

// Export singleton instance
export const pdfService = new PDFService();
