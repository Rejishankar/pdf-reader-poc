/**
 * JSON Schema Generator
 * Generates JSON Schema from extracted data
 */

import { RJSFSchema } from '@rjsf/utils';
import { ValidationUtils } from './validation';

export class SchemaGenerator {
  /**
   * Generate JSON Schema from extracted data
   */
  static generateSchema(data: any): RJSFSchema {
    const schema: RJSFSchema = {
      type: 'object',
      title: 'Extracted Form Data',
      properties: this.generateProperties(data),
    };

    return schema;
  }

  /**
   * Generate properties recursively
   */
  private static generateProperties(obj: any, depth: number = 0): any {
    const properties: any = {};

    for (const key in obj) {
      const value = obj[key];
      properties[key] = this.generatePropertySchema(key, value, depth);
    }

    return properties;
  }

  /**
   * Generate schema for a single property
   */
  private static generatePropertySchema(key: string, value: any, depth: number): any {
    const title = ValidationUtils.formatTitle(key);

    // Handle null/undefined/empty values
    if (value === null || value === undefined || value === '') {
      return {
        type: 'string',
        title,
        default: '',
      };
    }

    // Handle nested objects
    if (typeof value === 'object' && !Array.isArray(value)) {
      return {
        type: 'object',
        title,
        properties: this.generateProperties(value, depth + 1),
        'ui:ObjectFieldTemplate': 'bold-section',
      };
    }

    // Handle arrays
    if (Array.isArray(value)) {
      // Single string element - treat as string
      if (value.length === 1 && typeof value[0] === 'string') {
        return {
          type: 'string',
          title,
          default: value[0],
        };
      }

      // Array schema
      return {
        type: 'array',
        title,
        items: value.length > 0 ? this.inferItemType(value[0]) : { type: 'string' },
      };
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      return {
        type: 'boolean',
        title,
        default: value,
      };
    }

    // Handle numbers
    if (typeof value === 'number') {
      return {
        type: 'number',
        title,
        default: value,
      };
    }

    // Handle strings
    return {
      type: 'string',
      title,
      default: String(value),
    };
  }

  /**
   * Infer item type for arrays
   */
  private static inferItemType(item: any): any {
    if (item === null || item === undefined) {
      return { type: 'string' };
    }

    if (typeof item === 'object' && !Array.isArray(item)) {
      return {
        type: 'object',
        properties: this.generateProperties(item),
      };
    }

    if (typeof item === 'boolean') {
      return { type: 'boolean' };
    }

    if (typeof item === 'number') {
      return { type: 'number' };
    }

    return { type: 'string' };
  }
}
