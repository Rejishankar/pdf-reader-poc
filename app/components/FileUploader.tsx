/**
 * FileUploader Component
 * Handles PDF file selection and validation
 */

'use client';

import { ChangeEvent } from 'react';
import { CloudUpload as UploadIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { ValidationUtils } from '../../utils/validation';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onCancel: () => void;
  hasFile: boolean;
  isProcessing: boolean;
  isSubmitting: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  onCancel,
  hasFile,
  isProcessing,
  isSubmitting,
}) => {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile || isProcessing) {
      return;
    }

    try {
      // Validate file - will throw error if validation fails
      ValidationUtils.validatePDFFile(selectedFile);
      onFileSelect(selectedFile);
    } catch (error) {
      // Clear the input
      event.target.value = '';
      // Re-throw to be handled by parent component
      throw error;
    }
  };

  return (
    <div className="pdf-button-container">
      <label htmlFor="pdf-upload" className="pdf-upload-button">
        <UploadIcon className="pdf-icon-sm" />
        Browse PDF Files
      </label>
      <input
        id="pdf-upload"
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
        disabled={isProcessing}
      />

      {hasFile && (
        <button
          onClick={onCancel}
          className="pdf-cancel-button"
          disabled={isSubmitting}
        >
          <CancelIcon className="pdf-icon-sm" />
          Cancel
        </button>
      )}
    </div>
  );
};
