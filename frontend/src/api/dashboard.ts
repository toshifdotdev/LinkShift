import { apiFetch } from "./client";
import type { ActivityItem, AnalyticsDays, DashboardStats } from "@/types/api";

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

export function getLinkAnalytics(id: string, days?: AnalyticsDays) {
  return apiFetch<{ success: true; analytics: Record<string, unknown> }>(
    `/dashboard/${id}/analytics`,
    { query: days ? { days } : undefined },
  );
}

/** CSV export is an authenticated stream — fetch as blob, then download. */
export async function exportLinkCsv(id: string, days?: AnalyticsDays): Promise<void> {
  const qs = days ? `?days=${days}` : "";
  const res = await fetch(`/api/v1/dashboard/export/${id}${qs}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `link-${id}-scans.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
