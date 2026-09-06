
export const DEFAULT_SHORT_DOMAIN = "go.linkshift.in";

export function shortUrl(shortId: string, domainHost?: string | null): string {
  const host = domainHost || DEFAULT_SHORT_DOMAIN;
  return `https://${host}/${shortId}`;
}
