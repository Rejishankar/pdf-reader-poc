/**
 * Validation Utilities
 * Reusable validation logic to avoid duplication
 */

import * as yup from 'yup';
import config from '../config/app.config';

export class ValidationUtils {
  /**
   * Check if field name suggests email validation
   */
  static isEmailField(fieldName: string): boolean {
    return fieldName.toLowerCase().includes('email');
  }

  /**
   * Check if field name suggests phone validation
   */
  static isPhoneField(fieldName: string): boolean {
    const lower = fieldName.toLowerCase();
    return lower.includes('phone') || lower.includes('mobile') || lower.includes('contact');
  }

  /**
   * Check if field name suggests postal code validation
   */
  static isPostalField(fieldName: string): boolean {
    const lower = fieldName.toLowerCase();
    return lower.includes('postal') || lower.includes('zip');
  }

  /**
   * Get appropriate Yup schema for a field based on its name and value
   */
  static getFieldSchema(fieldName: string, value: any): yup.Schema {
    // Handle null/undefined/empty values
    if (value === null || value === undefined || value === '') {
      return yup.string().required(`${fieldName} is required`);
    }

    // Handle nested objects
    if (typeof value === 'object' && !Array.isArray(value)) {
      const shape: any = {};
      for (const key in value) {
        shape[key] = ValidationUtils.getFieldSchema(key, value[key]);
      }
      return yup.object().shape(shape);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return yup.array().of(yup.string()).min(1, `At least one ${fieldName} is required`);
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      return yup.boolean();
    }

    // Handle numbers
    if (typeof value === 'number') {
      return yup
        .number()
        .required(`${fieldName} is required`)
        .typeError(`${fieldName} must be a number`);
    }

    // Handle strings with specific validations
    let fieldSchema = yup.string().required(`${fieldName} is required`);

    if (ValidationUtils.isEmailField(fieldName)) {
      fieldSchema = fieldSchema.email(`${fieldName} must be a valid email`);
    }

    if (ValidationUtils.isPhoneField(fieldName)) {
      fieldSchema = fieldSchema.matches(
        config.validation.phoneRegex,
        `${fieldName} must be a valid phone number`
      );
    }

    if (ValidationUtils.isPostalField(fieldName)) {
      fieldSchema = fieldSchema.matches(
        config.validation.postalCodeRegex,
        `${fieldName} must be a valid postal code`
      );
    }

    return fieldSchema;
  }

  /**
   * Generate complete Yup validation schema from data structure
   */
  static generateYupSchema(data: any): yup.ObjectSchema<any> {
    const shape: any = {};

    for (const key in data) {
      shape[key] = ValidationUtils.getFieldSchema(key, data[key]);
    }

    return yup.object().shape(shape);
  }

  /**
   * Validate file before upload
   * Strictly checks for .pdf extension
   */
  static validatePDFFile(file: File): void {
    // Extract file extension
    const fileName = file.name;
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

    // Strictly check for .pdf extension
    if (extension !== '.pdf') {
      const { PDFFileTypeError } = require('../utils/errors');
      throw new PDFFileTypeError(fileName, extension || 'none');
    }

    // Additional check: validate MIME type
    if (file.type && !config.pdf.allowedTypes.includes(file.type)) {
      const { PDFFileTypeError } = require('../utils/errors');
      throw new PDFFileTypeError(fileName, extension);
    }

    // Check file size
    if (file.size > config.pdf.maxFileSize) {
      const { PDFFileSizeError } = require('../utils/errors');
      throw new PDFFileSizeError(file.size, config.pdf.maxFileSize);
    }

    // File is valid
  }

  /**
   * Format title from camelCase or snake_case
   */
  static formatTitle(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }
}
