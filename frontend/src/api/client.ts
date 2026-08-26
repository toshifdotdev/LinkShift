import { clearAccessToken, getAccessToken, setAccessToken } from "./token";

const API_BASE_URL = import.meta.env.DEV
  ? "/api/v1"
  : (import.meta.env.VITE_API_URL ?? "/api/v1");

/** Auth endpoints that must never trigger the refresh flow. */
const AUTH_EXEMPT = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/auth/forgot-password", "/auth/reset-password"];

export const UNAUTHORIZED_EVENT = "ls:unauthorized";

async function requestRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken?: string };
    if (!data.accessToken) return false;
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

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
  /** Internal: marks a request already retried after token refresh. */
  _retried?: boolean;
}

function buildUrl(pathStr: string, query?: RequestOptions["query"]): string {
  const url = `${API_BASE_URL}${pathStr}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function apiFetch<T>(pathStr: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal, headers, accessToken } = options;

  const token = accessToken ?? getAccessToken();
  const finalHeaders: Record<string, string> = { ...headers };
  /* FormData sets its own multipart boundary — never override it */
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData) finalHeaders["Content-Type"] = "application/json";
  if (token) finalHeaders["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(pathStr, query), {
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

  if (response.status === 401 && !options._retried) {
    const path = pathOnly(pathStr);
    const message = (data as { message?: string } | null)?.message ?? "";
    const expired = /expired|invalid|missing/i.test(message) || !path.startsWith("/auth/");
    const canRefresh = !AUTH_EXEMPT.includes(path) && expired && (await requestRefresh());
    if (canRefresh) {
      return apiFetch<T>(pathStr, { ...options, _retried: true });
    }
    clearAccessToken();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
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

function pathOnly(pathStr: string): string {
  const q = pathStr.indexOf("?");
  return q === -1 ? pathStr : pathStr.slice(0, q);
}

export { apiFetch };
