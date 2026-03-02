/**
 * BuggyComponent - For testing ErrorBoundary
 * Uncomment the throw statement to test error handling
 */

'use client';

import { useState } from 'react';
import { Button } from '@mui/material';

export const BuggyComponent = () => {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    // This will trigger the ErrorBoundary
    throw new Error('Test error: This is a simulated error to test the ErrorBoundary component');
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="font-semibold text-yellow-800 mb-2">Test ErrorBoundary</h3>
      <p className="text-sm text-yellow-700 mb-3">
        Click the button below to trigger an error and see the ErrorBoundary in action.
      </p>
      <Button
        variant="contained"
        color="error"
        onClick={() => setShouldThrow(true)}
        size="small"
      >
        Throw Error
      </Button>
    </div>
  );
};
