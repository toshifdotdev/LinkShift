/**
 * Public short-link construction.
 *
 * The approved public format is `<domain>/<shortId>` (the backend `/r/`
 * prefix is being retired). Link rows expose the existing `shortId` field;
 * nothing new is generated client-side.
 */
export const DEFAULT_SHORT_DOMAIN = "go.linkshift.in";

export function shortUrl(shortId: string, domainHost?: string | null): string {
  const host = domainHost || DEFAULT_SHORT_DOMAIN;
  return `https://${host}/${shortId}`;
}
