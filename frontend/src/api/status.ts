export type ComponentStatus = "operational" | "degraded" | "down";

export interface StatusComponent {
  id: string;
  name: string;
  status: ComponentStatus;
}

export interface StatusPayload {
  status: ComponentStatus;
  updatedAt: string;
  components: StatusComponent[];
}

/**
 * Public status feed. Deliberately unauthenticated and fetched with a plain
 * `fetch` rather than `apiFetch`: the endpoint must work for a visitor with no
 * session, and a 503 from it is a meaningful answer ("we are down"), not an
 * error to be retried through the refresh path.
 */
export async function fetchStatus(): Promise<StatusPayload> {
  const base = import.meta.env.DEV
    ? "/api/v1"
    : (import.meta.env.VITE_API_URL ?? "/api/v1");

  const res = await fetch(`${base}/status`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as StatusPayload | null;

  if (!data || typeof data.status !== "string" || !Array.isArray(data.components)) {
    throw new Error("Status feed unavailable");
  }

  return data;
}