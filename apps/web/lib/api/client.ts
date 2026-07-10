const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'gharazi_access_token';

type RequestOptions = RequestInit & { token?: string | null };

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;
  path: string;

  constructor(message: string, status: number, path: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.path = path;
    this.details = details;
  }
}

export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  if (typeof window !== 'undefined') window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  const token = options.token ?? getStoredToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      cache: 'no-store',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network request failed';
    throw new ApiRequestError(`Network error while calling ${path}: ${message}`, 0, path);
  }

  if (!response.ok) {
    const details = await parseErrorBody(response);
    const message = extractErrorMessage(details) || `Request failed with ${response.status}`;
    throw new ApiRequestError(message, response.status, path, details);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function toQueryString(params: Record<string, string | number | boolean | undefined | null>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  const output = query.toString();
  return output ? `?${output}` : '';
}

async function parseErrorBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  const text = await response.text().catch(() => '');
  return text || undefined;
}

function extractErrorMessage(details: unknown): string | undefined {
  if (!details) return undefined;
  if (typeof details === 'string') return details;
  if (typeof details !== 'object') return undefined;
  const body = details as { message?: unknown; error?: unknown; details?: unknown };
  if (Array.isArray(body.message)) return body.message.join('; ');
  if (typeof body.message === 'string') return body.message;
  if (typeof body.error === 'string') return body.error;
  if (Array.isArray(body.details)) return body.details.join('; ');
  return undefined;
}
