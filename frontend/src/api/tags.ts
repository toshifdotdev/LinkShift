import { apiFetch } from "./client";

/**
 * Campaign tags.
 *
 * Names rather than ids on the way in, because the picker takes free text and
 * creates on demand. Ids only come back when renaming or deleting, because
 * those need to target an existing row.
 */
export interface Tag {
  id: string;
  name: string;
  linkCount: number;
}

export function listTags(signal?: AbortSignal) {
  return apiFetch<{ data: Tag[] }>("/tags", { signal }).then((r) => r.data);
}

export function createTag(name: string) {
  return apiFetch<{ data: Tag }>("/tags", {
    method: "POST",
    body: { name },
  }).then((r) => r.data);
}

export function renameTag(id: string, name: string) {
  return apiFetch<{ data: { id: string; name: string } }>(`/tags/${id}`, {
    method: "PATCH",
    body: { name },
  }).then((r) => r.data);
}

export function deleteTag(id: string) {
  return apiFetch<{ success: true }>(`/tags/${id}`, { method: "DELETE" });
}

/** Normalised the same way the backend does, so the two never disagree. */
export const normaliseTagName = (raw: string): string => raw.trim().toLowerCase();