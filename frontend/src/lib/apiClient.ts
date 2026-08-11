import type { ApiErrorBody } from "@/types/auth";

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
}

/**
 * Thin fetch wrapper. The backend's success responses are the resource
 * itself (no envelope); errors are always `{ error: { code, message,
 * details? } }` per architecture.md's API conventions -- this is the single
 * place that shape is parsed.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network_error", "Couldn't reach the server. Check your connection and try again.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = payload as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      errorBody?.error?.code ?? "unknown_error",
      errorBody?.error?.message ?? "Something went wrong. Please try again.",
      errorBody?.error?.details,
    );
  }

  return payload as T;
}

/**
 * Same response-parsing contract as `apiRequest`, but for multipart form
 * uploads -- browsers must set their own `Content-Type` boundary for
 * `FormData`, so this intentionally does not send a JSON header/body.
 */
export async function apiUpload<T>(path: string, formData: FormData, token: string | null): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method: "POST", headers, body: formData });
  } catch {
    throw new ApiError(0, "network_error", "Couldn't reach the server. Check your connection and try again.");
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = payload as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      errorBody?.error?.code ?? "unknown_error",
      errorBody?.error?.message ?? "Something went wrong. Please try again.",
      errorBody?.error?.details,
    );
  }

  return payload as T;
}
