/**
 * Route-aware SEO utility for LinkShift.
 *
 * Zero-dependency head management: updates <title>, <meta>, <link rel="canonical">,
 * <meta name="robots">, Open Graph tags, and JSON-LD scripts on navigation.
 * Correctly replaces (never duplicates) elements when the route changes.
 *
 * Usage (inside a page component):
 *   useSeo({ title: "Pricing — LinkShift", description: "…", canonicalPath: "/pricing" });
 *   useSeo({ ...ROUTE_SEO["/pricing"] });
 *   useSeo({ ...ROUTE_SEO["/"], jsonLd: buildLandingJsonLd() });
 */

import { useEffect } from "react";

const ORIGIN = "https://linkshift.in";

/* ------------------------------------------------------------------ */
/*  Public interface                                                   */
/* ------------------------------------------------------------------ */

export interface SeoConfig {
  /** Document <title> (required) */
  title: string;
  /** <meta name="description"> */
  description?: string;
  /** Canonical URL path — joined with ORIGIN. Defaults to current pathname. */
  canonicalPath?: string;
  /** Robots directive — e.g. "index,follow" or "noindex,nofollow" */
  robots?: string;
  /** Override OG title (defaults to title) */
  ogTitle?: string;
  /** Override OG description (defaults to description) */
  ogDescription?: string;
  /** Override OG url (defaults to ORIGIN + canonicalPath) */
  ogUrl?: string;
  /** Structured data object — injected as <script type="application/ld+json"> */
  jsonLd?: Record<string, unknown> | null;
}

/**
 * React hook — apply SEO metadata for the lifetime of the component.
 * Re-runs when any config value changes (route transitions re-mount pages).
 */
export function useSeo(cfg: SeoConfig): void {
  useEffect(() => {
    applySeo(cfg);
  }, [cfg.title, cfg.description, cfg.canonicalPath, cfg.robots, cfg.jsonLd]);
}

/**
 * Imperative version — apply SEO metadata to the document head immediately.
 * Useful outside React or in layout components that don't re-mount.
 */
export function applySeo(cfg: SeoConfig): void {
  setTitle(cfg.title);
  setMeta("description", cfg.description ?? "");
  setCanonical(cfg.canonicalPath);
  setRobots(cfg.robots);
  setOg("og:title", cfg.ogTitle ?? cfg.title);
  setOg("og:description", cfg.ogDescription ?? cfg.description ?? "");
  setOg(
    "og:url",
    cfg.ogUrl ?? `${ORIGIN}${cfg.canonicalPath ?? window.location.pathname}`,
  );
  setJsonLd(cfg.jsonLd ?? null);
}

/* ------------------------------------------------------------------ */
/*  Per-route metadata map                                            */
/* ------------------------------------------------------------------ */

export interface RouteSeo {
  title: string;
  description: string;
  canonicalPath: string;
}

/** Static route definitions — titles/descriptions derived from page sources. */
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
};

/* ------------------------------------------------------------------ */
/*  JSON-LD structured-data builders                                  */
/* ------------------------------------------------------------------ */

/** Landing page: WebSite + WebApplication + Organization (truthful — identity
 *  facts mirror the public legal pages; no registrations or fake claims). */
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

/** FAQ page: FAQPage structured data. Pass in flat Q&A entries. */
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

/** BreadcrumbList for docs topics and other nested pages. */
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

/* ------------------------------------------------------------------ */
/*  Low-level DOM helpers (idempotent — update or create)               */
/* ------------------------------------------------------------------ */

function setTitle(title: string): void {
  document.title = title;
}

function setMeta(name: string, content: string): void {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(path?: string): void {
  const href = `${ORIGIN}${path ?? window.location.pathname}`;
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

function setRobots(content?: string): void {
  let el = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
  if (!el && content) {
    el = document.createElement("meta");
    el.name = "robots";
    document.head.appendChild(el);
  }
  if (el) {
    if (content) {
      el.content = content;
    } else {
      // Remove robots meta when not needed (default is index,follow)
      el.remove();
    }
  }
}

function setOg(property: string, content: string): void {
  let el = document.querySelector(
    `meta[property="${property}"]`,
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setJsonLd(data: Record<string, unknown> | null): void {
  // Remove any existing JSON-LD script we manage (identified by data-seo attribute)
  const existing = document.querySelector(
    'script[type="application/ld+json"][data-seo]',
  );
  if (existing) existing.remove();

  if (data) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo", "");
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
}
