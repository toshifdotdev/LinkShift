

import { useEffect } from "react";

const ORIGIN = "https://linkshift.in";





export interface SeoConfig {
  
  title: string;
  
  description?: string;
  
  canonicalPath?: string;
  
  robots?: string;
  
  ogTitle?: string;
  
  ogDescription?: string;
  
  ogUrl?: string;
  
  jsonLd?: Record<string, unknown> | null;
}


export function useSeo(cfg: SeoConfig): void {
  useEffect(() => {
    applySeo(cfg);
  }, [cfg.title, cfg.description, cfg.canonicalPath, cfg.robots, cfg.jsonLd]);
}


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





export interface RouteSeo {
  title: string;
  description: string;
  canonicalPath: string;
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
