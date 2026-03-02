
 // Validation Utilities - Reusable validation logic to avoid duplication

import * as yup from 'yup';
import config from '../config/app.config';

export class ValidationUtils {
  static isEmailField(fieldName: string): boolean {
    return fieldName.toLowerCase().includes('email');
  }

  static isPhoneField(fieldName: string): boolean {
    const lower = fieldName.toLowerCase();
    return lower.includes('phone') || lower.includes('mobile') || lower.includes('contact');
  }

  static isPostalField(fieldName: string): boolean {
    const lower = fieldName.toLowerCase();
    return lower.includes('postal') || lower.includes('zip');
  }

  static getFieldSchema(fieldName: string, value: any): yup.Schema {
    if (value === null || value === undefined || value === '') {
      return yup.string().required(`${fieldName} is required`);
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      const shape: any = {};
      for (const key in value) {
        shape[key] = ValidationUtils.getFieldSchema(key, value[key]);
      }
      return yup.object().shape(shape);
    }

    if (Array.isArray(value)) {
      return yup.array().of(yup.string()).min(1, `At least one ${fieldName} is required`);
    }

    if (typeof value === 'boolean') {
      return yup.boolean();
    }

    if (typeof value === 'number') {
      return yup
        .number()
        .required(`${fieldName} is required`)
        .typeError(`${fieldName} must be a number`);
    }

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

  static generateYupSchema(data: any): yup.ObjectSchema<any> {
    const shape: any = {};

    for (const key in data) {
      shape[key] = ValidationUtils.getFieldSchema(key, data[key]);
    }

    return yup.object().shape(shape);
  }

  
  static validatePDFFile(file: File): void {
    const fileName = file.name;
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

    if (extension !== '.pdf') {
      const { PDFFileTypeError } = require('../utils/errors');
      throw new PDFFileTypeError(fileName, extension || 'none');
    }

    if (file.type && !config.pdf.allowedTypes.includes(file.type)) {
      const { PDFFileTypeError } = require('../utils/errors');
      throw new PDFFileTypeError(fileName, extension);
    }

    if (file.size > config.pdf.maxFileSize) {
      const { PDFFileSizeError } = require('../utils/errors');
      throw new PDFFileSizeError(file.size, config.pdf.maxFileSize);
    }

  }

  static formatTitle(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }
}
