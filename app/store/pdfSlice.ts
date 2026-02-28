import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RJSFSchema } from '@rjsf/utils';

interface ExtractedData {
  [key: string]: any;
}

interface PDFState {
  file: File | null;
  pdfUrl: string;
  error: string;
  extractedData: ExtractedData | null;
  isExtracting: boolean;
  useOCR: boolean;
  formData: any;
  jsonSchema: RJSFSchema | null;
}

const initialState: PDFState = {
  file: null,
  pdfUrl: '',
  error: '',
  extractedData: null,
  isExtracting: false,
  useOCR: false,
  formData: null,
  jsonSchema: null,
};

const pdfSlice = createSlice({
  name: 'pdf',
  initialState,
  reducers: {
    setFile: (state, action: PayloadAction<File | null>) => {
      state.file = action.payload;
    },
    setPdfUrl: (state, action: PayloadAction<string>) => {
      state.pdfUrl = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    setExtractedData: (state, action: PayloadAction<ExtractedData | null>) => {
      state.extractedData = action.payload;
    },
    setIsExtracting: (state, action: PayloadAction<boolean>) => {
      state.isExtracting = action.payload;
    },
    setFormData: (state, action: PayloadAction<any>) => {
      state.formData = action.payload;
    },
    setJsonSchema: (state, action: PayloadAction<RJSFSchema | null>) => {
      state.jsonSchema = action.payload;
    },
    resetPDFState: () => initialState,
  },
});

export const {
  setFile,
  setPdfUrl,
  setError,
  setExtractedData,
  setIsExtracting,
  setFormData,
  setJsonSchema,
  resetPDFState,
} = pdfSlice.actions;

export default pdfSlice.reducer;
