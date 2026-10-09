import { ApiError } from '../types/index';

const BASE_URL = '';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const config: RequestInit = {
    method: 'GET',
    credentials: 'include', // Ensures linkpulse_session cookie is sent and received
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    ...customConfig,
  };

  try {
    const response = await fetch(url, config);

    // Parse JSON if response has content
    const contentType = response.headers.get('content-type');
    let data: any = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }
    }

    if (!response.ok) {
      const errorMessage =
        (data && typeof data === 'object' && data.error) ||
        (data && typeof data === 'object' && data.message) ||
        `Request failed with status ${response.status}`;
      const field = data && typeof data === 'object' ? data.field : undefined;

      throw new ApiError(errorMessage, response.status, field);
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      err instanceof Error ? err.message : 'Network communication error',
      0
    );
  }
}

export const api = {
  get: <T = any>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'GET' }),

  post: <T = any>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'DELETE' }),

  patch: <T = any>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
};

export default api;
