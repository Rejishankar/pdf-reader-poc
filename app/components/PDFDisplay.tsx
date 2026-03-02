/**
 * PDFDisplay Component
 * Displays the PDF file using iframe
 */

'use client';

import { Description as PdfIcon } from '@mui/icons-material';

interface PDFDisplayProps {
  pdfUrl: string | null;
  fileName?: string;
  error?: string;
}

export const PDFDisplay: React.FC<PDFDisplayProps> = ({ pdfUrl, fileName, error }) => {
  if (error) {
    return (
      <div className="pdf-empty-state">
        <div className="pdf-empty-state-content">
          <PdfIcon className="pdf-empty-state-icon text-red-500" />
          <p className="pdf-empty-state-title text-red-600">Error Loading PDF</p>
          <p className="pdf-empty-state-subtitle text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="pdf-empty-state">
        <div className="pdf-empty-state-content">
          <PdfIcon className="pdf-empty-state-icon" />
          <p className="pdf-empty-state-title">No PDF selected</p>
          <p className="pdf-empty-state-subtitle">Click "Browse PDF Files" to upload</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer-frame">
      <div className="pdf-viewer-header">
        <div className="pdf-viewer-header-content">
          <PdfIcon className="pdf-icon-sm" style={{ flexShrink: 0 }} />
          <span className="pdf-filename">{fileName}</span>
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
  );
};
