import { apiFetch } from "./client";
import type { DomainInstructions, DomainRow } from "@/types/api";

export function getDomains() {
  return apiFetch<{ success: true; data: DomainRow[] }>("/domains");
}

export function addDomain(host: string) {
  return apiFetch<{ success: true; instructions: DomainInstructions; message: string }>(
    "/domains",
    { method: "POST", body: { host } },
  );
}

export function updateDomain(id: string, host: string) {
  return apiFetch<{ success: true; instructions: DomainInstructions; message?: string }>(
    `/domains/${id}`,
    { method: "PATCH", body: { host } },
  );
}

export function deleteDomain(id: string) {
  return apiFetch<{ success: true; message: string }>(`/domains/${id}`, {
    method: "DELETE",
  });
}

export function verifyDomain(id: string) {
  return apiFetch<{ success: true; alreadyVerified?: boolean; message?: string }>(
    `/domains/${id}/verify`,
    { method: "POST" },
  );
}
