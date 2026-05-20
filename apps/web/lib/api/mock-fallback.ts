import { ApiRequestError } from './client';

export function mockFallbackEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_MOCK_FALLBACK === 'true';
}

export async function readWithFallback<T>(request: Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (!mockFallbackEnabled()) throw error;
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Using mock fallback for ${label}`, error);
    }
    return fallback;
  }
}

export function getUserFriendlyErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 0) return 'Network error. Please check that the API server is running and try again.';
    if (error.status === 401) return 'Please login before continuing.';
    if (error.status === 403) return 'You do not have permission to perform this action.';
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
