import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorScreen } from '~/screens/ErrorScreen';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useRouteError: vi.fn(),
    isRouteErrorResponse: vi.fn(),
  };
});

import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

const mockUseRouteError = vi.mocked(useRouteError);
const mockIsRouteErrorResponse = vi.mocked(isRouteErrorResponse);

describe('ErrorScreen', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the generic "unexpected error" message', () => {
    mockUseRouteError.mockReturnValue(new Error('Something failed'));
    mockIsRouteErrorResponse.mockReturnValue(false);
    render(<ErrorScreen />);
    expect(screen.getByText('errors.unexpected')).toBeInTheDocument();
  });

  it('displays the error message from an Error instance', () => {
    mockUseRouteError.mockReturnValue(new Error('Network timeout'));
    mockIsRouteErrorResponse.mockReturnValue(false);
    render(<ErrorScreen />);
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
  });

  it('displays statusText from a route error response', () => {
    mockUseRouteError.mockReturnValue({ status: 404, statusText: 'Not Found' });
    mockIsRouteErrorResponse.mockReturnValue(true);
    render(<ErrorScreen />);
    expect(screen.getByText('Not Found')).toBeInTheDocument();
  });

  it('displays "Unknown error" for non-Error, non-route-response values', () => {
    mockUseRouteError.mockReturnValue('plain string error');
    mockIsRouteErrorResponse.mockReturnValue(false);
    render(<ErrorScreen />);
    expect(screen.getByText('errors.unknown')).toBeInTheDocument();
  });

  it('displays "Unknown error" for null error value', () => {
    mockUseRouteError.mockReturnValue(null);
    mockIsRouteErrorResponse.mockReturnValue(false);
    render(<ErrorScreen />);
    expect(screen.getByText('errors.unknown')).toBeInTheDocument();
  });

  it('displays "Unknown error" for numeric error value', () => {
    mockUseRouteError.mockReturnValue(42);
    mockIsRouteErrorResponse.mockReturnValue(false);
    render(<ErrorScreen />);
    expect(screen.getByText('errors.unknown')).toBeInTheDocument();
  });

  it('logs the error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Logged error');
    mockUseRouteError.mockReturnValue(error);
    mockIsRouteErrorResponse.mockReturnValue(false);
    render(<ErrorScreen />);
    expect(consoleSpy).toHaveBeenCalledWith(error);
    consoleSpy.mockRestore();
  });
});
