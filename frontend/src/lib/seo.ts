

import { useEffect } from "react";

const ORIGIN = "https://linkshift.in";

/**
 * The default social card. Every route falls back to this image, which is
 * declared statically in index.html — no route ships its own artwork yet, and
 * the audit explicitly ruled out generating new image assets.
 */
export const DEFAULT_OG_IMAGE = `${ORIGIN}/brand/og-image.png`;

export const DEFAULT_OG_IMAGE_WIDTH = "1200";
export const DEFAULT_OG_IMAGE_HEIGHT = "630";
export const DEFAULT_OG_IMAGE_ALT = "LinkShift — link shortening, QR codes and analytics";

/**
 * The site's Open Graph locale. LinkShift is operated from India and prices in
 * INR alongside USD, so en_IN is the accurate primary locale for crawlers and
 * social unfurlers that read it.
 */
export const OG_LOCALE = "en_IN";





export interface SeoConfig {
  
  title: string;
  
  description?: string;
  
  canonicalPath?: string;
  
  robots?: string;
  
  ogTitle?: string;
  
  ogDescription?: string;
  
  ogUrl?: string;
  
  /**
   * Absolute URL of the social card for this route. Optional: when omitted the
   * route falls back to DEFAULT_OG_IMAGE. Dimensions and alt text are managed
   * alongside it so the tags cannot drift apart.
   */
  ogImage?: string;
  
  ogImageAlt?: string;
  
  jsonLd?: Record<string, unknown> | null;
}


export function useSeo(cfg: SeoConfig): void {
  useEffect(() => {
    applySeo(cfg);
    // Managed metadata is applied imperatively, so React cannot diff it. Every
    // value the config can carry must therefore appear here — omitting one
    // means a route change that only alters that field is never re-applied.
  }, [
    cfg.title,
    cfg.description,
    cfg.canonicalPath,
    cfg.robots,
    cfg.ogTitle,
    cfg.ogDescription,
    cfg.ogUrl,
    cfg.ogImage,
    cfg.ogImageAlt,
    cfg.jsonLd,
  ]);
}


export function applySeo(cfg: SeoConfig): void {
  const canonical = `${ORIGIN}${cfg.canonicalPath ?? window.location.pathname}`;

  setTitle(cfg.title);
  setMeta("description", cfg.description ?? "");
  setCanonical(cfg.canonicalPath);
  setRobots(cfg.robots);

  // --- Open Graph ---------------------------------------------------------
  // Every og tag this module owns is written on every call, so a value from
  // the previous route can never survive a navigation. og:image in particular
  // was previously unmanaged, which left every public page sharing the
  // homepage card.
  setOg("og:title", cfg.ogTitle ?? cfg.title);
  setOg("og:description", cfg.ogDescription ?? cfg.description ?? "");
  setOg("og:url", cfg.ogUrl ?? canonical);
  setOg("og:type", "website");
  setOg("og:site_name", "LinkShift");
  setOg("og:locale", OG_LOCALE);
  setOg("og:image", cfg.ogImage ?? DEFAULT_OG_IMAGE);
  setOg("og:image:width", DEFAULT_OG_IMAGE_WIDTH);
  setOg("og:image:height", DEFAULT_OG_IMAGE_HEIGHT);
  setOg("og:image:type", "image/png");
  setOg("og:image:alt", cfg.ogImageAlt ?? DEFAULT_OG_IMAGE_ALT);

  // --- Twitter / X --------------------------------------------------------
  // Twitter meta uses `name`, not `property`, so it is written separately.
  // summary_large_image matches the 1200×630 card declared above.
  setNamedMeta("twitter:card", "summary_large_image");
  setNamedMeta("twitter:title", cfg.ogTitle ?? cfg.title);
  setNamedMeta("twitter:description", cfg.ogDescription ?? cfg.description ?? "");
  setNamedMeta("twitter:image", cfg.ogImage ?? DEFAULT_OG_IMAGE);
  setNamedMeta("twitter:image:alt", cfg.ogImageAlt ?? DEFAULT_OG_IMAGE_ALT);

  setJsonLd(cfg.jsonLd ?? null);
}






export interface RouteSeo {
  title: string;
  description: string;
  canonicalPath: string;
  /**
   * Indexability directive for the prerendered document. Omitted means the
   * default `index,follow` written by the prerender step. Only the error
   * document sets this — every entry in `PUBLIC_PATHS` is meant to be indexed.
   */
  robots?: string;
}


export const ROUTE_SEO: Record<string, RouteSeo> = {
  "/": {
    title: "LinkShift — URL Shortener with QR Codes & Link Analytics",
    description:
      "LinkShift turns long URLs into precise short links. Every code ships with QR, custom domains, and analytics that show where every click comes from.",
    canonicalPath: "/",
  },

  "/pricing": {
    title: "Pricing — LinkShift",
    description:
      "Start free, move up when your links earn it. Every limit is written down — nothing hidden behind a sales call. Plans from Free to Pro.",
    canonicalPath: "/pricing",
  },

  "/docs": {
    title: "Documentation — LinkShift",
    description:
      "Short guides for every surface of LinkShift — links, domains, QR, analytics, billing and your account.",
    canonicalPath: "/docs",
  },

  "/faq": {
    title: "FAQ — LinkShift",
    description:
      "The short version of everything. Answers to common questions about LinkShift links, QR codes, domains, analytics, billing, and account security.",
    canonicalPath: "/faq",
  },

  "/contact": {
    title: "Contact — LinkShift",
    description:
      "How to reach the humans behind LinkShift — support, billing, privacy and abuse reports.",
    canonicalPath: "/contact",
  },

  "/privacy": {
    title: "Privacy Policy — LinkShift",
    description:
      "What LinkShift collects, why, and how long we keep it. Written for the product as it actually works.",
    canonicalPath: "/privacy",
  },

  "/terms": {
    title: "Terms of Service — LinkShift",
    description:
      "The agreement between you and LinkShift for using the service. Short, readable, and enforceable.",
    canonicalPath: "/terms",
  },

  "/refunds": {
    title: "Refund & Cancellation Policy — LinkShift",
    description:
      "How cancellation, refunds and failed international payments work for LinkShift subscriptions.",
    canonicalPath: "/refunds",
  },

  "/shipping": {
    title: "Shipping & Delivery Policy — LinkShift",
    description:
      "LinkShift is a fully digital service — there is nothing to ship. This policy states what is delivered, how, and when delivery is complete.",
    canonicalPath: "/shipping",
  },

  "/acceptable-use": {
    title: "Acceptable Use Policy — LinkShift",
    description:
      "The line between a short-link tool and an abuse tool. Links that cross it are removed.",
    canonicalPath: "/acceptable-use",
  },

  "/register": {
    title: "Create your account — LinkShift",
    description:
      "Sign up for LinkShift and get your first short link in thirty seconds. Free plan, no card required.",
    canonicalPath: "/register",
  },

  "/login": {
    title: "Log in — LinkShift",
    description: "Sign in to your LinkShift account and pick up where your links left off.",
    canonicalPath: "/login",
  },

  /**
   * The static 404 document CloudFront serves for 403/404 custom error
   * responses (deploy/DEPLOYMENT.md §12b).
   *
   * This is an error document, not a destination: it is NOT in PUBLIC_PATHS,
   * NOT in the sitemap, and is prerendered noindex,nofollow so that a crawler
   * which somehow reaches it drops it instead of indexing it. It carries a
   * canonical so the emitted document is self-describing, but because it is
   * served in place of the requested URL it is never a ranking target.
   */
  "/404": {
    title: "Page not found — LinkShift",
    description: "The page you requested does not exist. Head back to LinkShift.",
    canonicalPath: "/404",
    robots: "noindex,nofollow",
  },
};






export function buildLandingJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "LinkShift",
        url: ORIGIN,
      },
      {
        "@type": "WebApplication",
        name: "LinkShift",
        url: ORIGIN,
        applicationCategory: "WebApplication",
        description:
          "LinkShift turns long URLs into precise short links. Every code ships with QR, custom domains, and analytics that show where every click comes from.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
          name: "Free plan",
        },
      },
      {
        "@type": "Organization",
        name: "LinkShift",
        url: ORIGIN,
        logo: `${ORIGIN}/brand/logo-mark.svg`,
        email: "linkshift.admin@gmail.com",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Dehradun",
          addressRegion: "Uttarakhand",
          addressCountry: "IN",
        },
      },
    ],
  };
}


export function buildFaqJsonLd(
  entries: Array<{ q: string; a: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.a,
      },
    })),
  };
}


export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${ORIGIN}${item.path}`,
    })),
  };
}





function setTitle(title: string): void {
  document.title = title;
}

function setMeta(name: string, content: string): void {
  setNamedMeta(name, content);
}

/**
 * Writes a `meta[name]` tag.
 *
 * Scoped to the head and duplicate-safe: rather than trusting a single lookup,
 * any stray duplicates are collapsed so repeated navigation cannot accumulate
 * tags. The prerendered HTML already contains these tags, which is why an
 * existing element is reused rather than unconditionally appended.
 */
function setNamedMeta(name: string, content: string): void {
  const matches = headQueryAll(`meta[name="${name}"]`) as HTMLMetaElement[];

  const el = matches[0] ?? createMeta("name", name);
  for (const extra of matches.slice(1)) extra.remove();

  el.content = content;
}

function setCanonical(path?: string): void {
  const href = `${ORIGIN}${path ?? window.location.pathname}`;
  const matches = headQueryAll('link[rel="canonical"]') as HTMLLinkElement[];

  const el = matches[0] ?? createLink("canonical");
  for (const extra of matches.slice(1)) extra.remove();

  el.href = href;
}

function setRobots(content?: string): void {
  const matches = headQueryAll('meta[name="robots"]') as HTMLMetaElement[];

  if (!content) {
    // Absent config means "no restriction" — drop every copy so a noindex
    // carried in from a previous route cannot persist.
    for (const el of matches) el.remove();
    return;
  }

  const el = matches[0] ?? createMeta("name", "robots");
  for (const extra of matches.slice(1)) extra.remove();

  el.content = content;
}

/**
 * Writes a `meta[property]` tag (Open Graph).
 *
 * Duplicate-safe for the same reason as setNamedMeta, with one addition: a
 * `name`-keyed tag with the same key is removed, because the Google crawler
 * and several unfurlers accept either form and a leftover `name`-keyed copy
 * would shadow the `property`-keyed one.
 */
function setOg(property: string, content: string): void {
  for (const stray of headQueryAll(`meta[name="${property}"]`)) stray.remove();

  const matches = headQueryAll(`meta[property="${property}"]`) as HTMLMetaElement[];
  const el = matches[0] ?? createMeta("property", property);
  for (const extra of matches.slice(1)) extra.remove();

  el.content = content;
}

function setJsonLd(data: Record<string, unknown> | null): void {
  // JSON-LD is per-route: the previous route's graph must not survive, so
  // every managed block is removed and the current one re-created.
  for (const existing of headQueryAll('script[type="application/ld+json"][data-seo]')) {
    existing.remove();
  }

  if (data) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo", "");
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
}

/**
 * Queries within <head> only. Document-wide queries would also match nodes
 * inside the app tree (a literal "og:image" string in rendered content, an
 * in-page demo), and mutating those would corrupt the UI.
 */
function headQueryAll(selector: string): Element[] {
  return Array.from(document.head?.querySelectorAll(selector) ?? []);
}

function createMeta(attr: "name" | "property", value: string): HTMLMetaElement {
  const el = document.createElement("meta");
  el.setAttribute(attr, value);
  document.head.appendChild(el);
  return el;
}

function createLink(rel: string): HTMLLinkElement {
  const el = document.createElement("link");
  el.rel = rel;
  document.head.appendChild(el);
  return el;
}

