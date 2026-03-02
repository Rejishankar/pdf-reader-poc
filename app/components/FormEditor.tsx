/**
 * FormEditor Component
 * Handles the extracted data form editing
 */

'use client';

import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import { RJSFSchema } from '@rjsf/utils';
import * as yup from 'yup';
import { Skeleton } from '@mui/material';
import {
  DataObject as DataObjectIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import config from '../../config/app.config';

interface FormEditorProps {
  jsonSchema: RJSFSchema | null;
  formData: any;
  yupSchema: yup.ObjectSchema<any> | null;
  isExtracting: boolean;
  isSubmitting: boolean;
  hasFile: boolean;
  onChange: (data: any) => void;
  onSubmit: (data: any) => void;
  customValidate: (formData: any, errors: any, yupSchema: yup.ObjectSchema<any>) => any;
}

export const FormEditor: React.FC<FormEditorProps> = ({
  jsonSchema,
  formData,
  yupSchema,
  isExtracting,
  isSubmitting,
  hasFile,
  onChange,
  onSubmit,
  customValidate,
}) => {
  const generateUiSchema = () => {
    return {
      'ui:submitButtonOptions': {
        submitText: isSubmitting ? 'Saving...' : 'Save to File',
        norender: false,
        props: {
          className: `bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full mt-4 flex items-center justify-center gap-2 ${
            isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
          }`,
          disabled: isSubmitting,
        },
      },
    };
  };

  // Loading state
  if (isExtracting) {
    return (
      <div className="space-y-4">
        <div className="pdf-loading-state">
          <p className="pdf-loading-text">Analyzing PDF with AI...</p>
        </div>
        {Array.from({ length: config.ui.skeletonCount }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            height={index % 3 === 0 ? 60 : 50}
            className={index % 3 === 0 ? 'rounded-lg' : ''}
          />
        ))}
      </div>
    );
  }

  // Form with data
  if (jsonSchema && formData) {
    return (
      <div className="space-y-4">
        <Form
          schema={jsonSchema}
          formData={formData}
          validator={validator}
          onChange={onChange}
          onSubmit={onSubmit}
          uiSchema={generateUiSchema()}
          customValidate={(formData, errors) =>
            yupSchema ? customValidate(formData, errors, yupSchema) : errors
          }
          showErrorList={false}
          liveValidate
        />
      </div>
    );
  }

  // No data but has file
  if (!formData && hasFile) {
    return (
      <div className="pdf-no-data-state">
        <DataObjectIcon className="pdf-icon-lg" />
        <p className="pdf-no-data-text">No data extracted yet</p>
      </div>
    );
  }

  // No file uploaded
  return (
    <div className="pdf-no-data-state">
      <UploadIcon className="pdf-icon-lg" />
      <p className="pdf-no-data-text">Upload a PDF to extract data</p>
      <p className="pdf-empty-state-subtitle" style={{ color: 'rgb(107 114 128)' }}>
        AI will automatically extract form fields
      </p>
    </div>
  );
};
