import { apiFetch } from "./client";
import type { ActivityItem, AnalyticsDays, DashboardStats, LinkAnalytics, LinkCharts } from "@/types/api";
import { getAccessToken } from "./token";

export function getStats(days?: AnalyticsDays) {
  return apiFetch<{ success: true; data: DashboardStats }>("/dashboard/stats", {
    query: days ? { days } : undefined,
  });
}

export function getActivity(days?: AnalyticsDays) {
  return apiFetch<{ success: true; data: ActivityItem[] }>("/dashboard/activity", {
    query: days ? { days } : undefined,
  });
}

export function getLinkAnalytics(linkId: string, days?: AnalyticsDays) {
  return apiFetch<{ success: true; analytics: LinkAnalytics }>(
    `/dashboard/${linkId}/analytics`,
    { query: days ? { days } : undefined },
  );
}

export function getLinkCharts(linkId: string, days?: AnalyticsDays) {
  return apiFetch<{ success: true; data: LinkCharts }>(
    `/dashboard/${linkId}/charts`,
    { query: days ? { days } : undefined },
  );
}

/**
 * CSV export is an authenticated stream — the endpoint is Bearer-header-only
 * (auth middleware never reads the refresh cookie), so the request must carry
 * the Authorization header. Fetched as a blob, then downloaded.
 */
export async function exportLinkCsv(
  id: string,
  days: AnalyticsDays | undefined,
  filename: string,
): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error("Not signed in");
  const qs = days ? `?days=${days}` : "";
  const res = await fetch(`/api/v1/dashboard/export/${id}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (res.status === 403) throw new Error("CSV export requires the Creator plan or higher");
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
