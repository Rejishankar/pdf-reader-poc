/**
 * PDFViewer Component - Main component that integrates file upload, PDF display, and form editing
 */

'use client';

import { useState, useRef } from 'react';
import * as yup from 'yup';
import { useAppDispatch, useAppSelector } from '../redux/store/storeHooks';
import { toast } from 'react-toastify';
import { Cancel as CancelIcon } from '@mui/icons-material';
import { Dialog, Button } from '@mui/material';
import {
  setFile,
  setPdfUrl,
  setError,
  setExtractedData,
  setIsExtracting,
  setFormData,
  setJsonSchema,
  resetPDFState,
} from '../redux/reducer/pdfReducer';
import { FileUploader } from './FileUploader';
import { PDFDisplay } from './PDFDisplay';
import { FormEditor } from './FormEditor';
import { pdfService, PDFService } from '../../services/pdf.service';
import { ValidationUtils } from '../../utils/validation';
import { SchemaGenerator } from '../../utils/schemaGenerator';
import { PDFValidationError, PDFFileSizeError, PDFFileTypeError, ErrorHandler } from '../../utils/errors';

export default function PDFViewer() {
  const dispatch = useAppDispatch();
  const {
    file,
    pdfUrl,
    error,
    isExtracting,
    formData,
    jsonSchema,
  } = useAppSelector((state) => state.pdf);

  const [yupSchema, setYupSchema] = useState<yup.ObjectSchema<any> | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isProcessingFile = useRef(false);

  
  //Extract data from PDF using API service

  const extractPDFData = async (file: File) => {
    if (isExtracting || isProcessingFile.current) {
      return;
    }

    isProcessingFile.current = true;
    dispatch(setIsExtracting(true));
    dispatch(setError(''));

    try {
      // Use PDF service for API call
      const result = await pdfService.extractPDFData(file);
      
      dispatch(setExtractedData(result.data));

      // Transform and generate schemas using utilities
      const transformedData = PDFService.transformArraysToStrings(result.data);
      const schema = SchemaGenerator.generateSchema(transformedData);
      const validationSchema = ValidationUtils.generateYupSchema(transformedData);

      dispatch(setJsonSchema(schema));
      dispatch(setFormData(transformedData));
      setYupSchema(validationSchema);

      toast.success('PDF data extracted successfully!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (err: any) {
      const errorMessage = ErrorHandler.handle(err);
      dispatch(setError(errorMessage));
      dispatch(setExtractedData(null));
      dispatch(setJsonSchema(null));
      dispatch(setFormData(null));

      toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 5000,
        onClose: confirmCancel,
      });
    } finally {
      dispatch(setIsExtracting(false));
      isProcessingFile.current = false;
    }
  };


  //Custom validation using Yup schema
  const customValidate = (formData: any, errors: any, yupSchema: yup.ObjectSchema<any>) => {
    try {
      yupSchema.validateSync(formData, { abortEarly: false });
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        err.inner.forEach((error) => {
          if (error.path) {
            const path = error.path.split('.');
            let current = errors;

            for (let i = 0; i < path.length - 1; i++) {
              if (!current[path[i]]) {
                current[path[i]] = {};
              }
              current = current[path[i]];
            }

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

 
  //Handle form submission - save to JSON file
  
  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);

    try {
      dispatch(setFormData(data.formData));

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

      toast.success('Form data saved successfully!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      const errorMessage = ErrorHandler.handle(error);
      toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  
  // Handle form data changes
  const handleFormChange = (data: any) => {
    dispatch(setFormData(data.formData));
  };

  // Handle file selection
  const handleFileSelect = async (selectedFile: File) => {
    if (isProcessingFile.current || isExtracting) {
      return;
    }

    try {
      ValidationUtils.validatePDFFile(selectedFile);
      
      dispatch(setFile(selectedFile));
      dispatch(setError(''));

      const url = URL.createObjectURL(selectedFile);
      dispatch(setPdfUrl(url));

      extractPDFData(selectedFile);
    } catch (err: unknown) {
      let errorMessage = 'Failed to process file';
      
      if (err instanceof PDFFileTypeError) {
        errorMessage = err.message;
      } else if (err instanceof PDFFileSizeError) {
        errorMessage = err.message;
      } else if (err instanceof PDFValidationError) {
        errorMessage = err.message;
      } else {
        errorMessage = ErrorHandler.handle(err);
      }
      
      dispatch(setError(errorMessage));
      dispatch(setFile(null));
      dispatch(setPdfUrl(''));
      dispatch(setExtractedData(null));

      toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 5000,
      });
    }
  };

  // Handle cancel action
  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  // Confirm cancel and reset all state
  const confirmCancel = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }

    dispatch(resetPDFState());
    setYupSchema(null);
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
        <FileUploader
          onFileSelect={handleFileSelect}
          onCancel={handleCancel}
          hasFile={!!file}
          isProcessing={isExtracting}
          isSubmitting={isSubmitting}
        />

        <PDFDisplay
          pdfUrl={pdfUrl}
          fileName={file?.name || ''}
          error={error}
        />
      </div>

      {/* Right Panel - Extracted Data Form */}
      <div className="pdf-panel-right">
        <div className="pdf-form-container">
          <FormEditor
            jsonSchema={jsonSchema}
            formData={formData}
            yupSchema={yupSchema}
            isExtracting={isExtracting}
            isSubmitting={isSubmitting}
            hasFile={!!file}
            onChange={handleFormChange}
            onSubmit={handleFormSubmit}
            customValidate={customValidate}
          />
        </div>
      </div>

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
