import { apiFetch } from "./client";

/**
 * Bulk link import.
 *
 * The endpoint is a two-phase flow, and the UI must respect that: `dryRun`
 * reports what would happen without writing, and only a confirmed second call
 * with `dryRun: false` creates anything. Quota ceilings hard-stop the batch, so
 * the user needs to see that before committing rather than after.
 */

export interface ImportLinkRow {
  targetUrl: string;
  slug?: string;
  name?: string;
}

export type ImportRejectionCode =
  | "INVALID_ROW"
  | "DUPLICATE_IN_FILE"
  | "SLUG_TAKEN"
  | "LIMIT_REACHED";

export interface ImportRowResult {
  row: number;
  outcome: "created" | "rejected";
  shortId?: string;
  reason?: string;
  code?: ImportRejectionCode;
}

export interface ImportSummary {
  total: number;
  created: number;
  rejected: number;
  blocked?: string;
}

export interface ImportResult {
  dryRun: boolean;
  summary: ImportSummary;
  results: ImportRowResult[];
}

export function previewLinkImport(domainId: string, rows: ImportLinkRow[]) {
  return apiFetch<ImportResult>("/links/import", {
    method: "POST",
    body: { domainId, rows, dryRun: true },
  });
}

export function commitLinkImport(domainId: string, rows: ImportLinkRow[]) {
  return apiFetch<ImportResult>("/links/import", {
    method: "POST",
    body: { domainId, rows, dryRun: false },
  });
}
