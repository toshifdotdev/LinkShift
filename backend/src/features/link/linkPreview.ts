/**
 * Open Graph card for a short link.
 *
 * When someone shares `go.linkshift.in/launch`, the chat app's crawler fetches
 * that URL itself. A 302 redirect carries no body, so the crawler has nothing
 * to describe the link with and the share renders as bare text. This document
 * gives it something: Open Graph tags, which every major chat and social
 * platform reads.
 *
 * Only crawlers are ever sent this. A human click is redirected straight
 * through, because showing an interstitial to someone who clicked a link would
 * be the single most annoying behaviour this product could have.
 */

/** Escapes text for interpolation into HTML text or a double-quoted attribute. */
const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

export type LinkPreviewInput = {
    /** The short URL as the crawler requested it, used for og:url. */
    shortUrl: string;
    title: string;
    description?: string | null;
    imageUrl?: string | null;
    /** Site name shown as the card's footer. */
    siteName: string;
};

/**
 * A link only gets a card when an owner actually wrote something. Returning
 * null here is what keeps every existing link behaving exactly as before.
 */
export const hasLinkPreview = (link: {
    ogTitle?: string | null;
    ogDescription?: string | null;
    ogImageUrl?: string | null;
}): boolean =>
    Boolean(
        link.ogTitle?.trim() ||
        link.ogDescription?.trim() ||
        link.ogImageUrl?.trim()
    );

const MAX_DESCRIPTION = 300;

/**
 * Renders the crawler document.
 *
 * Every interpolated value is escaped. This HTML is served from the short-link
 * domain, so an unescaped title would be stored XSS against the domain people
 * are told to trust when clicking a link.
 */
export const renderLinkPreview = (input: LinkPreviewInput): string => {
    const title = input.title.trim();
    const description = input.description?.trim().slice(0, MAX_DESCRIPTION);
    const imageUrl = input.imageUrl?.trim();

    const escapeAttr = escapeHtml;

    const meta = [
        `<title>${escapeHtml(title)}</title>`,
        `<meta name="description" content="${escapeAttr(description || "")}">`,
        // Open Graph: the card itself.
        `<meta property="og:type" content="website">`,
        `<meta property="og:site_name" content="${escapeAttr(input.siteName)}">`,
        `<meta property="og:title" content="${escapeAttr(title)}">`,
        `<meta property="og:url" content="${escapeAttr(input.shortUrl)}">`,
        // X reads twitter: tags and ignores og: for large cards in places, so
        // both are emitted rather than betting on one.
        `<meta name="twitter:card" content="${imageUrl ? "summary_large_image" : "summary"}">`,
        `<meta name="twitter:title" content="${escapeAttr(title)}">`,
    ];

    if (description) {
        meta.push(`<meta property="og:description" content="${escapeAttr(description)}">`);
        meta.push(`<meta name="twitter:description" content="${escapeAttr(description)}">`);
    }

    if (imageUrl) {
        meta.push(`<meta property="og:image" content="${escapeAttr(imageUrl)}">`);
        meta.push(`<meta name="twitter:image" content="${escapeAttr(imageUrl)}">`);
    }

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
${meta.join("\n")}
</head>
<body>
<main>
<h1>${escapeHtml(title)}</h1>
${description ? `<p>${escapeHtml(description)}</p>` : ""}
</main>
</body>
</html>`;
};