import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from '~/components/ErrorBoundary';

/** A component that throws synchronously during render. */
const ThrowingComponent = ({ message }: { message: string }) => {
  throw new Error(message);
};

/** A component that renders normally. */
const SafeComponent = () => <p data-testid="safe">All good</p>;

describe('ErrorBoundary component', () => {
  afterEach(cleanup);

  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('safe')).toBeInTheDocument();
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders default fallback when a child throws', () => {
    // Suppress expected console.error from React's error boundary internals.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Boom!" />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
    expect(screen.getByText('Boom!')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('renders custom fallback prop instead of default when provided', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error UI</div>}>
        <ThrowingComponent message="Custom fallback test" />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    // Default message should NOT appear.
    expect(screen.queryByText('Something went wrong.')).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it('does not show fallback when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>,
    );
    expect(screen.queryByText('Something went wrong.')).not.toBeInTheDocument();
  });

  it('logs the error via console.error when a child throws', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Log this error" />
      </ErrorBoundary>,
    );
    // componentDidCatch logs with the [ErrorBoundary] prefix.
    const calls = errorSpy.mock.calls.flat().map(String);
    const hasLogEntry = calls.some((c) => c.includes('[ErrorBoundary]') || c.includes('Log this error'));
    expect(hasLogEntry).toBe(true);
    errorSpy.mockRestore();
  });

  it('displays the error message inside the fallback paragraph', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const message = 'Detailed error description';
    render(
      <ErrorBoundary>
        <ThrowingComponent message={message} />
      </ErrorBoundary>,
    );
    expect(screen.getByText(message)).toBeInTheDocument();
    spy.mockRestore();
  });
});
