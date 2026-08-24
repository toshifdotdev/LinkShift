import { getAccessToken } from "./token";

const API_BASE_URL = import.meta.env.DEV
  ? "/api/v1"
  : (import.meta.env.VITE_API_URL ?? "/api/v1");

/** Error carrying the real HTTP status from the backend. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Legacy option — overrides the stored token when provided. */
  accessToken?: string;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = `${API_BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal, headers, accessToken } = options;

  const token = accessToken ?? getAccessToken();
  const finalHeaders: Record<string, string> = { ...headers };
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json";
  if (token) finalHeaders["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: finalHeaders,
      credentials: "include",
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch only throws on network-level failures
    throw new ApiError(0, "Network error — could not reach the server");
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // non-JSON body — leave data null
  }

  if (!response.ok) {
    const payload = data as { message?: string } | null;
    throw new ApiError(
      response.status,
      payload?.message ?? `Request failed (${response.status})`,
    );
  }

  return data as T;
}

export { apiFetch };
