
//JSON Schema Generator - Generates JSON Schema from extracted data


import { RJSFSchema } from '@rjsf/utils';
import { ValidationUtils } from './validation';

export class SchemaGenerator {

  static generateSchema(data: any): RJSFSchema {
    const schema: RJSFSchema = {
      type: 'object',
      title: 'Extracted Form Data',
      properties: this.generateProperties(data),
    };

    return schema;
  }

  private static generateProperties(obj: any, depth: number = 0): any {
    const properties: any = {};

    for (const key in obj) {
      const value = obj[key];
      properties[key] = this.generatePropertySchema(key, value, depth);
    }

    return properties;
  }

  private static generatePropertySchema(key: string, value: any, depth: number): any {
    const title = ValidationUtils.formatTitle(key);

    if (value === null || value === undefined || value === '') {
      return {
        type: 'string',
        title,
        default: '',
      };
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return {
        type: 'object',
        title,
        properties: this.generateProperties(value, depth + 1),
        'ui:ObjectFieldTemplate': 'bold-section',
      };
    }

    if (Array.isArray(value)) {
      if (value.length === 1 && typeof value[0] === 'string') {
        return {
          type: 'string',
          title,
          default: value[0],
        };
      }

      return {
        type: 'array',
        title,
        items: value.length > 0 ? this.inferItemType(value[0]) : { type: 'string' },
      };
    }

    if (typeof value === 'boolean') {
      return {
        type: 'boolean',
        title,
        default: value,
      };
    }

    if (typeof value === 'number') {
      return {
        type: 'number',
        title,
        default: value,
      };
    }

    return {
      type: 'string',
      title,
      default: String(value),
    };
  }

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
