/**
 * Application Configuration
 * Centralized configuration management for the application
 */

export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  pdf: {
    maxFileSize: number; // in bytes
    allowedTypes: string[];
    ocrDpi: number;
  };
  validation: {
    phoneRegex: RegExp;
    postalCodeRegex: RegExp;
  };
  ui: {
    toastDuration: number;
    skeletonCount: number;
  };
}

const config: AppConfig = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000',
    timeout: 60000, // 60 seconds
    retryAttempts: 3,
  },
  pdf: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf'],
    ocrDpi: 300,
  },
  validation: {
    phoneRegex: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
    postalCodeRegex: /^[0-9]{5,6}$/,
  },
  ui: {
    toastDuration: 3000,
    skeletonCount: 8,
  },
};

export default config;
