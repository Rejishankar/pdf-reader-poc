import PDFViewer from './components/PDFViewer';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function Home() {
  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <PDFViewer />
    </ErrorBoundary>
  );
}
