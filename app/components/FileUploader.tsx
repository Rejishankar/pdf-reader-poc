/**
 * FileUploader Component
 * Handles PDF file selection and validation
 */

'use client';

import { ChangeEvent } from 'react';
import { CloudUpload as UploadIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { ValidationUtils } from '../../utils/validation';
import { ErrorHandler } from '../../utils/errors';

interface FileUploaderProps {
  // callback may return a promise (PDFViewer uses an async handler)
  onFileSelect: (file: File) => void | Promise<void>;
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
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile || isProcessing) {
      return;
    }

    try {
      // Validate file - will throw error if validation fails
      ValidationUtils.validatePDFFile(selectedFile);
      
      await onFileSelect(selectedFile as File);
    } catch (error) {
      event.target.value = '';
      console.error('[FileUploader] error during file select', error);
      toast.error(ErrorHandler.handle(error), {
        position: 'top-right',
        autoClose: 5000,
      });
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
