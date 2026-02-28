'use client';

import { useState, useRef } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import { RJSFSchema } from '@rjsf/utils';
import * as yup from 'yup';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toast } from 'react-toastify';
import {
  CloudUpload as UploadIcon,
  Cancel as CancelIcon,
  Description as PdfIcon,
  DataObject as DataObjectIcon,
} from '@mui/icons-material';
import { Dialog, Button, Skeleton } from '@mui/material';
import {
  setFile,
  setPdfUrl,
  setError,
  setExtractedData,
  setIsExtracting,
  setFormData,
  setJsonSchema,
  resetPDFState,
} from '../store/pdfSlice';

interface ExtractedData {
  [key: string]: any;
}

export default function PDFViewer() {
  const dispatch = useAppDispatch();
  const {
    file,
    pdfUrl,
    error,
    extractedData,
    isExtracting,
    formData,
    jsonSchema,
  } = useAppSelector((state) => state.pdf);

  const [yupSchema, setYupSchema] = useState<yup.ObjectSchema<any> | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isProcessingFile = useRef(false);

  const extractPDFData = async (file: File) => {
    // Prevent multiple simultaneous extractions
    if (isExtracting || isProcessingFile.current) {
      console.log('Extraction already in progress, skipping...');
      return;
    }

    isProcessingFile.current = true;
    dispatch(setIsExtracting(true));
    dispatch(setError(''));

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Call Python FastAPI directly
      const pythonApiUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';

      const endpoint = '/extract-pdf';

      console.log(`Sending request to ${pythonApiUrl}${endpoint}...`);

      const response = await fetch(`${pythonApiUrl}${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      console.log('Received response from Python API:', response);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to extract data');
      } else if (result.success === false) {
        throw new Error(result.error || 'AI extraction failed');
      }

      // Set extracted data and generate JSON schema
      dispatch(setExtractedData(result.data));

      // Transform data: convert single-element arrays to strings
      const transformedData = transformArraysToStrings(result.data);

      // Generate JSON Schema from extracted data
      const schema = generateSchemaFromData(transformedData);
      dispatch(setJsonSchema(schema));
      dispatch(setFormData(transformedData));

      // Generate Yup validation schema
      const validationSchema = generateYupSchema(transformedData);
      setYupSchema(validationSchema);

      // Show success toast
      toast.success('PDF data extracted successfully!', {
        position: 'top-right',
        autoClose: 3000,
      });

    } catch (err: any) {
      console.log(' response status:', err);
      const errorMessage = err.message || 'Failed to extract PDF data';
      dispatch(setError(errorMessage));
      dispatch(setExtractedData(null));
      dispatch(setJsonSchema(null));
      dispatch(setFormData(null));

      // Show error toast
      toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 5000,
        onClose: () => {
          confirmCancel();
        }
      });
    } finally {
      dispatch(setIsExtracting(false));
      isProcessingFile.current = false;
    }
  };

  // Transform single-element arrays to strings
  const transformArraysToStrings = (data: any): any => {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      // If single element array with string value, return the string
      if (data.length === 1 && typeof data[0] === 'string') {
        return data[0];
      }
      // Otherwise, recursively transform array elements
      return data.map(item => transformArraysToStrings(item));
    }

    if (typeof data === 'object') {
      const transformed: any = {};
      for (const key in data) {
        transformed[key] = transformArraysToStrings(data[key]);
      }
      return transformed;
    }

    return data;
  };

  // Generate Yup validation schema from data structure
  const generateYupSchema = (data: any): yup.ObjectSchema<any> => {
    const buildSchema = (obj: any): any => {
      const shape: any = {};

      for (const key in obj) {
        const value = obj[key];

        if (value === null || value === undefined || value === '') {
          // Required string field
          shape[key] = yup.string().required(`${key} is required`);
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          // Nested object - recursively build schema
          shape[key] = yup.object().shape(buildSchema(value));
        } else if (Array.isArray(value)) {
          // Array field
          shape[key] = yup.array().of(yup.string()).min(1, `At least one ${key} is required`);
        } else if (typeof value === 'boolean') {
          // Boolean field
          shape[key] = yup.boolean();
        } else if (typeof value === 'number') {
          // Number field with validation
          shape[key] = yup.number().required(`${key} is required`).typeError(`${key} must be a number`);
        } else {
          // String field - add common validations based on field name
          const keyLower = key.toLowerCase();
          let fieldSchema = yup.string().required(`${key} is required`);

          // Email validation
          if (keyLower.includes('email')) {
            fieldSchema = fieldSchema.email(`${key} must be a valid email`);
          }

          // Phone validation
          if (keyLower.includes('phone') || keyLower.includes('mobile') || keyLower.includes('contact')) {
            fieldSchema = fieldSchema.matches(
              /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
              `${key} must be a valid phone number`
            );
          }

          // Postal code validation
          if (keyLower.includes('postal') || keyLower.includes('zip')) {
            fieldSchema = fieldSchema.matches(
              /^[0-9]{5,6}$/,
              `${key} must be a valid postal code`
            );
          }

          shape[key] = fieldSchema;
        }
      }

      return shape;
    };

    return yup.object().shape(buildSchema(data));
  };

  // Generate JSON Schema from extracted data
  const generateSchemaFromData = (data: any): RJSFSchema => {
    const formatTitle = (key: string): string => {
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
    };

    const generateProperties = (obj: any, depth: number = 0): any => {
      const properties: any = {};

      for (const key in obj) {
        const value = obj[key];

        if (value === null || value === undefined || value === '') {
          properties[key] = {
            type: 'string',
            title: formatTitle(key),
            default: ''
          };
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          // Recursively handle nested objects with bold styling
          properties[key] = {
            type: 'object',
            title: formatTitle(key),
            properties: generateProperties(value, depth + 1),
            'ui:ObjectFieldTemplate': 'bold-section'
          };
        } else if (Array.isArray(value)) {
          // For arrays with single string values, treat as simple string instead
          if (value.length === 1 && typeof value[0] === 'string') {
            properties[key] = {
              type: 'string',
              title: formatTitle(key),
              default: value[0]
            };
          } else {
            properties[key] = {
              type: 'array',
              title: formatTitle(key),
              items: value.length > 0 ? inferItemType(value[0]) : { type: 'string' }
            };
          }
        } else if (typeof value === 'boolean') {
          properties[key] = {
            type: 'boolean',
            title: formatTitle(key),
            default: value
          };
        } else if (typeof value === 'number') {
          properties[key] = {
            type: 'number',
            title: formatTitle(key),
            default: value
          };
        } else {
          properties[key] = {
            type: 'string',
            title: formatTitle(key),
            default: String(value)
          };
        }
      }

      return properties;
    };

    const inferItemType = (item: any): any => {
      if (item === null || item === undefined) {
        return { type: 'string' };
      }
      if (typeof item === 'object' && !Array.isArray(item)) {
        return {
          type: 'object',
          properties: generateProperties(item)
        };
      }
      if (typeof item === 'boolean') {
        return { type: 'boolean' };
      }
      if (typeof item === 'number') {
        return { type: 'number' };
      }
      return { type: 'string' };
    };

    const schema: RJSFSchema = {
      type: 'object',
      title: 'Extracted Form Data',
      properties: generateProperties(data)
    };

    return schema;
  };

  // Generate UI Schema to style nested sections
  const generateUiSchema = (data: any): any => {
    const uiSchema: any = {
      'ui:submitButtonOptions': {
        submitText: isSubmitting ? 'Saving...' : 'Save to File',
        norender: false,
        props: {
          className: `bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full mt-4 flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`,
          disabled: isSubmitting
        }
      }
    };

    return uiSchema;
  };

  // Custom validation function using Yup
  const customValidate = (formData: any, errors: any, yupSchema: yup.ObjectSchema<any>) => {
    try {
      yupSchema.validateSync(formData, { abortEarly: false });
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        err.inner.forEach((error) => {
          if (error.path) {
            const path = error.path.split('.');
            let current = errors;

            // Navigate to the correct error location
            for (let i = 0; i < path.length - 1; i++) {
              if (!current[path[i]]) {
                current[path[i]] = {};
              }
              current = current[path[i]];
            }

            // Add error message
            const lastKey = path[path.length - 1];
            if (!current[lastKey]) {
              current[lastKey] = {};
            }
            current[lastKey].__errors = [error.message];
          }
        });
      }
    }
    return errors;
  };

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);

    try {
      console.log('Form submitted with data:', data.formData);
      dispatch(setFormData(data.formData));

      // Save form data to JSON file
      const jsonString = JSON.stringify(data.formData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file?.name.replace('.pdf', '')}_extracted_data.json` || 'extracted_data.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Show success toast
      toast.success('Form data saved successfully!', {
        position: 'top-right',
        autoClose: 3000,
      });

      // Don't automatically reset - let user decide

    } catch (error) {
      console.error('Error saving form data:', error);
      toast.error('Failed to save form data', {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (data: any) => {
    dispatch(setFormData(data.formData));
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    // Prevent multiple file processing
    if (!selectedFile || isProcessingFile.current || isExtracting) {
      if (isProcessingFile.current || isExtracting) {
        console.log('Already processing a file, ignoring new upload');
      }
      return;
    }

    if (selectedFile && selectedFile.type === 'application/pdf') {
      dispatch(setFile(selectedFile));
      dispatch(setError(''));

      // Create a URL for the PDF file
      const url = URL.createObjectURL(selectedFile);
      dispatch(setPdfUrl(url));

      console.log('Selected PDF file:', selectedFile);

      // Extract data from PDF
      await extractPDFData(selectedFile);
    } else {
      const errorMsg = 'Please select a valid PDF file';
      dispatch(setError(errorMsg));
      dispatch(setFile(null));
      dispatch(setPdfUrl(''));
      dispatch(setExtractedData(null));

      toast.error(errorMsg, {
        position: 'top-right',
        autoClose: 3000,
      });
    }
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    // Revoke the PDF URL to free up memory
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }

    // Reset all Redux state
    dispatch(resetPDFState());

    // Reset yup schema
    setYupSchema(null);

    // Reset the file input element
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }

    // Reset processing flag
    isProcessingFile.current = false;

    setShowCancelDialog(false);

    toast.info('All changes discarded', {
      position: 'top-right',
      autoClose: 2000,
    });
  };

  return (
    <div className="pdf-viewer-container">
      {/* Left Panel - PDF Viewer */}
      <div className="pdf-panel-left">
        <div className="pdf-button-container">
          <label
            htmlFor="pdf-upload"
            className="pdf-upload-button"
          >
            <UploadIcon className="pdf-icon-sm" />
            Browse PDF Files
          </label>
          <input
            id="pdf-upload"
            type="file"
            accept="application/pdf"
            onChange={onFileChange}
            className="hidden"
          />

          {file && (
            <button
              onClick={handleCancel}
              className="pdf-cancel-button"
              disabled={isSubmitting}
            >
              <CancelIcon className="pdf-icon-sm" />
              Cancel
            </button>
          )}

        </div>

        {pdfUrl && (
          <div className="pdf-viewer-frame">
            <div className="pdf-viewer-header">
              <div className="pdf-viewer-header-content">
                <PdfIcon className="pdf-icon-sm" style={{ flexShrink: 0 }} />
                <span className="pdf-filename">{file?.name}</span>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="PDF Viewer"
              />
            </div>
          </div>
        )}

        {!pdfUrl && !error && (
          <div className="pdf-empty-state">
            <div className="pdf-empty-state-content">
              <PdfIcon className="pdf-empty-state-icon" />
              <p className="pdf-empty-state-title">No PDF selected</p>
              <p className="pdf-empty-state-subtitle">Click "Browse PDF Files" to upload</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Extracted Data Form */}
      <div className="pdf-panel-right">
        <div className="pdf-form-container">
          {isExtracting && (
            <div className="space-y-4">
              <div className="pdf-loading-state">
                <p className="pdf-loading-text">Analyzing PDF with AI...</p>
              </div>
              <Skeleton variant="rectangular" height={60} className="rounded-lg" />
              <Skeleton variant="rectangular" height={50} />
              <Skeleton variant="rectangular" height={50} />
              <Skeleton variant="rectangular" height={50} />
              <Skeleton variant="rectangular" height={50} />
              <Skeleton variant="rectangular" height={60} className="rounded-lg" />
              <Skeleton variant="rectangular" height={50} />
              <Skeleton variant="rectangular" height={50} />
            </div>
          )}

          {!isExtracting && jsonSchema && formData && (
            <div className="space-y-4">
              <Form
                schema={jsonSchema}
                formData={formData}
                validator={validator}
                onChange={handleFormChange}
                onSubmit={handleFormSubmit}
                uiSchema={generateUiSchema(formData)}
                customValidate={(formData, errors) =>
                  yupSchema ? customValidate(formData, errors, yupSchema) : errors
                }
                showErrorList={false}
                liveValidate
              />
            </div>
          )}

          {!isExtracting && !formData && file && (
            <div className="pdf-no-data-state">
              <DataObjectIcon className="pdf-icon-lg" />
              <p className="pdf-no-data-text">No data extracted yet</p>
            </div>
          )}

          {!isExtracting && !formData && !file && (
            <div className="pdf-no-data-state">
              <UploadIcon className="pdf-icon-lg" />
              <p className="pdf-no-data-text">Upload a PDF to extract data</p>
              <p className="pdf-empty-state-subtitle" style={{ color: 'rgb(107 114 128)' }}>AI will automatically extract form fields</p>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-description"
      >
        <div className="pdf-dialog-content">
          <h2 id="cancel-dialog-title" className="pdf-dialog-title">
            Confirm Cancel
          </h2>
          <p id="cancel-dialog-description" className="pdf-dialog-description">
            Are you sure you want to cancel? All extracted data and changes will be lost.
          </p>
          <div className="pdf-dialog-actions">
            <Button
              onClick={confirmCancel}
              variant="contained"
              className="bg-red-600 hover:bg-red-700"
              startIcon={<CancelIcon />}
            >
              Yes
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
