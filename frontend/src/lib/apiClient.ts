import {
  ApiClientError,
  type ApiErrorResponse,
  type ApiResponse,
} from '../types/api.ts';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  rawEnvelope?: boolean;
  skipAuthInterceptor?: boolean;
}

type UnauthorizedCallback = () => void;
let globalUnauthorizedCallback: UnauthorizedCallback | null = null;

export function setOnUnauthorizedCallback(cb: UnauthorizedCallback | null) {
  globalUnauthorizedCallback = cb;
}

export function createApiClient(customBaseUrl?: string) {
  // Resolve base URL from environment or custom argument, falling back to '/api'
  const envBaseUrl =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_API_BASE_URL
      : undefined;

  const rawBase = customBaseUrl ?? envBaseUrl ?? '/api';
  const normalizedBase = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

  async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${normalizedBase}${cleanEndpoint}`;

    const headers = new Headers(options.headers || {});
    if (options.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const config: RequestInit = {
      credentials: options.credentials ?? 'include',
      ...options,
      headers,
      body:
        options.body !== undefined && typeof options.body !== 'string'
          ? JSON.stringify(options.body)
          : (options.body as BodyInit | null | undefined),
    };

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network request failed';
      throw new ApiClientError('NETWORK_ERROR', message, 0);
    }

    // 204 No Content or body-less responses
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    let payload: unknown;
    if (isJson) {
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
    } else {
      payload = await response.text();
    }

    // Intercept 401 Unauthorized unless explicitly skipped (e.g. login attempt)
    if (response.status === 401 && !options.skipAuthInterceptor && globalUnauthorizedCallback) {
      globalUnauthorizedCallback();
    }

    // Check for API error response envelope: { error: { code, message, details? } }
    if (payload && typeof payload === 'object' && 'error' in payload) {
      const errResp = payload as ApiErrorResponse;
      throw new ApiClientError(
        errResp.error.code || 'UNKNOWN_ERROR',
        errResp.error.message || 'An unexpected API error occurred',
        response.status,
        errResp.error.details
      );
    }

    if (!response.ok) {
      const message =
        typeof payload === 'string' && payload.length > 0
          ? payload
          : response.statusText || `Request failed with status ${response.status}`;

      throw new ApiClientError('HTTP_ERROR', message, response.status);
    }

    // Return full envelope if rawEnvelope is true
    if (options.rawEnvelope) {
      return payload as T;
    }

    // Unwrap envelope: { data: T, meta?: ... }
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return (payload as ApiResponse<T>).data;
    }

    return payload as T;
  }

  return {
    baseUrl: normalizedBase,
    setOnUnauthorized(cb: UnauthorizedCallback | null): void {
      globalUnauthorizedCallback = cb;
    },
    request,
    get<T>(endpoint: string, options?: Omit<RequestOptions, 'body'>): Promise<T> {
      return request<T>(endpoint, { ...options, method: 'GET' });
    },
    getEnvelope<T>(endpoint: string, options?: Omit<RequestOptions, 'body'>): Promise<ApiResponse<T>> {
      return request<ApiResponse<T>>(endpoint, { ...options, method: 'GET', rawEnvelope: true });
    },
    post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'body'>): Promise<T> {
      return request<T>(endpoint, { ...options, method: 'POST', body });
    },
    postEnvelope<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'body'>): Promise<ApiResponse<T>> {
      return request<ApiResponse<T>>(endpoint, { ...options, method: 'POST', body, rawEnvelope: true });
    },
    patch<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'body'>): Promise<T> {
      return request<T>(endpoint, { ...options, method: 'PATCH', body });
    },
    delete<T>(endpoint: string, options?: Omit<RequestOptions, 'body'>): Promise<T> {
      return request<T>(endpoint, { ...options, method: 'DELETE' });
    },
  };
}

export const apiClient = createApiClient();
