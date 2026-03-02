/**
 * ErrorBoundary Component
 * Catches React errors and provides fallback UI with recovery options
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // Update state with error info
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external error tracking service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo) {
    const errorLog = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };

    console.log('Error logged:', errorLog);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  copyErrorToClipboard = () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const errorText = `
Error: ${error.message}

Stack Trace:
${error.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}

Timestamp: ${new Date().toISOString()}
User Agent: ${typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'}
URL: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}
    `.trim();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(errorText);
      alert('Error details copied to clipboard');
    }
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback, showDetails = false } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-red-100 rounded-full p-4">
                <ErrorIcon className="text-red-600" style={{ fontSize: 48 }} />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
              Oops! Something went wrong
            </h1>

            <p className="text-gray-600 text-center mb-6">
              We're sorry, but something unexpected happened. Don't worry, your data is safe.
              {errorCount > 1 && (
                <span className="block mt-2 text-sm text-orange-600">
                  This error has occurred {errorCount} times.
                </span>
              )}
            </p>

            {/* Error Details (Collapsible) */}
            {showDetails && error && (
              <details className="mb-6 bg-gray-50 rounded-lg p-4">
                <summary className="cursor-pointer font-semibold text-gray-700 flex items-center gap-2">
                  <BugReportIcon className="text-gray-500" fontSize="small" />
                  Technical Details
                </summary>
                <div className="mt-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 mb-1">Error Message:</h3>
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded font-mono">
                      {error.message}
                    </p>
                  </div>
                  {error.stack && (
                    <div>
                      <h3 className="font-semibold text-sm text-gray-700 mb-1">Stack Trace:</h3>
                      <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto max-h-32 font-mono">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div>
                      <h3 className="font-semibold text-sm text-gray-700 mb-1">Component Stack:</h3>
                      <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto max-h-32 font-mono">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Recovery Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <Button
                variant="contained"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={this.handleReset}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Try Again
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
              >
                Go Home
              </Button>
            </div>

            {/* Copy Error Button */}
            {showDetails && error && (
              <div className="text-center">
                <Button
                  variant="text"
                  size="small"
                  onClick={this.copyErrorToClipboard}
                  className="text-gray-500"
                >
                  Copy Error Details
                </Button>
              </div>
            )}

            {/* Help Text */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                If this problem persists, please contact support with the error details above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}
