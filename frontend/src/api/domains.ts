import { apiFetch } from "./client";
import type { DomainRow } from "@/types/api";

export function getDomains() {
  return apiFetch<{ success: true; data: DomainRow[] }>("/domains");
}
