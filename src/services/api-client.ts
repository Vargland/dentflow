/**
 * Base API client for the DentFlow Go backend.
 * Attaches the JWT Bearer token and normalises error responses.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'

/** Typed API error thrown when the Go backend returns a non-2xx status. */
export class ApiError extends Error {
  /** HTTP status code. */
  readonly status: number
  /** Machine-readable error code from the Go API. */
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)

    this.name = 'ApiError'

    this.status = status

    this.code = code
  }
}

/** Shape of the error body returned by the Go API. */
interface ApiErrorBody {
  error: {
    code: string
    message: string
    status: number
  }
}

/**
 * Executes a fetch request against the Go API.
 *
 * @param path   - API path relative to `/api/v1` (e.g. `/patients`).
 * @param token  - JWT Bearer token from Auth.js session.
 * @param init   - Optional RequestInit overrides.
 * @returns Parsed JSON response body.
 * @throws {ApiError} When the server returns a non-2xx response.
 */
const request = async <T>(path: string, token: string, init: RequestInit = {}): Promise<T> => {
  const url = `${API_BASE}${path}`

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })

  if (!res.ok) {
    let code = 'INTERNAL_ERROR'

    let message = `HTTP ${res.status}`

    try {
      const body = (await res.json()) as ApiErrorBody

      code = body.error?.code ?? code

      message = body.error?.message ?? message
    } catch {
      // ignore parse errors — use defaults above
    }

    throw new ApiError(res.status, code, message)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

/** HTTP verb helpers. */
export const apiClient = {
  /**
   * Performs a GET request.
   * @param path  - API path.
   * @param token - JWT Bearer token.
   */
  get: <T>(path: string, token: string) => request<T>(path, token),

  /**
   * Performs a POST request.
   * @param path  - API path.
   * @param token - JWT Bearer token.
   * @param body  - JSON-serialisable request body.
   */
  post: <T>(path: string, token: string, body: unknown) =>
    request<T>(path, token, { method: 'POST', body: JSON.stringify(body) }),

  /**
   * Performs a PUT request.
   * @param path  - API path.
   * @param token - JWT Bearer token.
   * @param body  - JSON-serialisable request body.
   */
  put: <T>(path: string, token: string, body: unknown) =>
    request<T>(path, token, { method: 'PUT', body: JSON.stringify(body) }),

  /**
   * Performs a DELETE request.
   * @param path  - API path.
   * @param token - JWT Bearer token.
   */
  delete: <T>(path: string, token: string) => request<T>(path, token, { method: 'DELETE' }),
}
