import { listLinks } from "@/api/links";

/**
 * Browser-facing references for a link.
 *
 * Every link record carries two identifiers: `id`, an internal database CUID,
 * and `shortId`, the human-readable slug that also forms the public short URL.
 * Only the slug belongs in a dashboard URL — a CUID in the address bar leaks an
 * implementation detail, makes bookmarked URLs unreadable, and breaks when a
 * link is recreated. Internal calls (`GET /links/:id`, QR endpoints, analytics)
 * keep speaking `id`; `resolveLinkRef` is the single bridge between the two.
 */
export type LinkRefLike = { id: string; shortId?: string | null };

/** The canonical reference to write into a URL: the slug. */
export function linkRef(link: LinkRefLike): string {
  const slug = link.shortId?.trim();
  return slug ? slug : link.id;
}

/** Exact match for a URL reference in an already loaded list; slug wins over id. */
export function findLinkByRef<T extends LinkRefLike>(
  ref: string | null | undefined,
  links: readonly T[],
): T | null {
  if (!ref) return null;
  return links.find((link) => link.shortId === ref) ?? links.find((link) => link.id === ref) ?? null;
}

export type ResolvedLinkRef = { id: string; shortId: string | null };

/**
 * Turn whatever a URL carries into the database id the id-based endpoints expect.
 *
 * New URLs carry the slug; bookmarks made before the URL was human-readable
 * carry the CUID. The links list search covers name, destination and slug, so a
 * single lookup finds either spelling and hands back the canonical slug too,
 * which lets the page rewrite an old URL into the canonical one.
 *
 * A `null` slug in the result is therefore the signal that nothing of yours
 * matched: a page that only wants a *real* link — QR Studio opening preselected,
 * say — trusts the result only when a slug comes back.
 *
 * Anything the lookup cannot see is passed straight through, so an unknown or
 * legacy reference behaves exactly as it did before instead of 404ing, and a
 * failing lookup never turns a working deep link into an error screen.
 */
export async function resolveLinkRef(ref: string, signal?: AbortSignal): Promise<ResolvedLinkRef> {
  try {
    const res = await listLinks({ page: 1, limit: 50, search: ref }, signal);
    const hit = findLinkByRef(ref, res.data);
    if (hit) return { id: hit.id, shortId: hit.shortId ?? null };
  } catch {
    /* pass through below */
  }
  return { id: ref, shortId: null };
}
