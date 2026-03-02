# ErrorBoundary Component

A React Error Boundary component that catches JavaScript errors anywhere in the component tree, logs those errors, and displays a fallback UI with recovery options.

## Features

- ✅ **Error Catching** - Catches errors in child component tree
- ✅ **Fallback UI** - Beautiful error page with clear messaging
- ✅ **Error Logging** - Logs errors to console and external services
- ✅ **Recovery Options** - Multiple ways to recover (Try Again, Reload, Go Home)
- ✅ **Error Details** - Collapsible technical details for debugging
- ✅ **Copy to Clipboard** - Easy error reporting
- ✅ **Error Tracking** - Ready for integration with Sentry, LogRocket, etc.
- ✅ **Development Mode** - Show/hide details based on environment

## Usage

### Basic Usage

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### With Details in Development

```tsx
<ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
  <YourComponent />
</ErrorBoundary>
```

### With Custom Error Handler

```tsx
<ErrorBoundary
  showDetails={true}
  onError={(error, errorInfo) => {
    // Send to error tracking service
    console.log('Custom error handler:', error);
  }}
>
  <YourComponent />
</ErrorBoundary>
```

### With Custom Fallback

```tsx
<ErrorBoundary
  fallback={
    <div>
      <h1>Something went wrong</h1>
      <button onClick={() => window.location.reload()}>Reload</button>
    </div>
  }
>
  <YourComponent />
</ErrorBoundary>
```

### Using HOC Pattern

```tsx
import { withErrorBoundary } from './components/ErrorBoundary';

const MyComponent = () => {
  return <div>My Component</div>;
};

export default withErrorBoundary(MyComponent, {
  showDetails: process.env.NODE_ENV === 'development',
});
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Component tree to monitor for errors |
| `fallback` | `ReactNode` | Built-in UI | Custom fallback UI to display on error |
| `onError` | `(error: Error, errorInfo: ErrorInfo) => void` | - | Custom error handler callback |
| `showDetails` | `boolean` | `false` | Show technical error details (recommended for development only) |

## Error Recovery Options

The default fallback UI provides three recovery options:

1. **Try Again** - Resets the error boundary state and re-renders children
2. **Reload Page** - Performs a full page reload
3. **Go Home** - Navigates to the home page

## Integration with Error Tracking Services

To integrate with services like Sentry, modify the `logErrorToService` method:

```tsx
logErrorToService(error: Error, errorInfo: ErrorInfo) {
  // Sentry example
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo.componentStack,
      },
    },
  });
}
```

## Error Information Logged

The ErrorBoundary logs the following information:

- Error message
- Stack trace
- Component stack trace
- Timestamp
- User agent
- Current URL
- Error count (number of times error occurred)

## Technical Details Display

When `showDetails={true}`, users can expand a collapsible section showing:

- Error message (highlighted in red)
- Full stack trace
- Component stack trace
- Copy to clipboard button for easy bug reporting

## Best Practices

1. **Wrap at App Level** - Place ErrorBoundary at the root level to catch all errors
2. **Development vs Production** - Show details in development, hide in production:
   ```tsx
   showDetails={process.env.NODE_ENV === 'development'}
   ```
3. **Multiple Boundaries** - Use multiple boundaries for different sections:
   ```tsx
   <ErrorBoundary>
     <Sidebar />
   </ErrorBoundary>
   <ErrorBoundary>
     <MainContent />
   </ErrorBoundary>
   ```
4. **Custom Error Handlers** - Always integrate with error tracking in production
5. **User-Friendly Messages** - Keep error messages clear and non-technical for users

## What Errors Are Caught?

ErrorBoundary catches errors during:
- Rendering
- Lifecycle methods
- Constructors of child components

ErrorBoundary does **NOT** catch errors in:
- Event handlers (use try-catch)
- Asynchronous code (use try-catch)
- Server-side rendering
- Errors in the ErrorBoundary itself

## Example: Full Implementation

```tsx
// app/layout.tsx
import { ErrorBoundary } from './components/ErrorBoundary';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary
          showDetails={process.env.NODE_ENV === 'development'}
          onError={(error, errorInfo) => {
            // Log to external service
            if (process.env.NODE_ENV === 'production') {
              // Sentry.captureException(error);
            }
          }}
        >
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

## Styling

The ErrorBoundary uses Tailwind CSS classes for styling. If you need to customize the appearance, you can:

1. Provide a custom `fallback` prop with your own styled component
2. Modify the built-in fallback UI styles in `ErrorBoundary.tsx`
3. Override Tailwind classes with your own CSS

## Testing

To test the ErrorBoundary, create a component that throws an error:

```tsx
const BuggyComponent = () => {
  throw new Error('Test error');
  return <div>This will never render</div>;
};

// In your test/dev environment
<ErrorBoundary showDetails={true}>
  <BuggyComponent />
</ErrorBoundary>
```
