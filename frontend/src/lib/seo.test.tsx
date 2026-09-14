import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import {
  ROUTE_SEO,
  applySeo,
  useSeo,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  OG_LOCALE,
} from "./seo";

// ---------------------------------------------------------------------------
// Runtime SEO metadata management.
//
// applySeo() writes imperatively, so React cannot diff it: a tag that is not
// explicitly reset on every call leaks into the next route. The regressions
// these tests pin down are the ones the audit found:
//
//   * og:image was never managed, so every public page shared the homepage
//     social card;
//   - og:locale and the twitter:* tags were absent from the runtime path;
//   - the 404 route's `noindex` could survive navigation to an indexable page.
//
// Navigation is exercised through real router Links so the effect re-runs
// exactly as it does in the app, rather than by calling applySeo() directly
// and assuming the wiring.
// ---------------------------------------------------------------------------

const ORIGIN = "https://linkshift.in";

/** Reads a single meta tag's content, asserting there is only one. */
function meta(selector: string): string | null {
  const matches = document.head.querySelectorAll(selector);
  expect(matches.length, `expected exactly one ${selector}, got ${matches.length}`).toBeLessThanOrEqual(1);
  return matches[0]?.getAttribute("content") ?? null;
}

function og(property: string): string | null {
  return meta(`meta[property="${property}"]`);
}

function named(name: string): string | null {
  return meta(`meta[name="${name}"]`);
}

/** Counts every managed tag form, including strays that would shadow a value. */
function countManaged(prop: string): number {
  return (
    document.head.querySelectorAll(`meta[property="${prop}"]`).length +
    document.head.querySelectorAll(`meta[name="${prop}"]`).length
  );
}

/** Seeds the head with the tags index.html ships, minus the dynamic ones. */
function seedDocument() {
  document.head.innerHTML = `
    <title>LinkShift — URL Shortener with QR Codes & Link Analytics</title>
    <meta name="description" content="seed description" />
    <meta property="og:title" content="seed og title" />
    <meta property="og:description" content="seed og description" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${ORIGIN}/" />
    <meta property="og:locale" content="${OG_LOCALE}" />
    <meta property="og:image" content="${DEFAULT_OG_IMAGE}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:alt" content="${DEFAULT_OG_IMAGE_ALT}" />
    <meta property="og:site_name" content="LinkShift" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="seed twitter title" />
    <meta name="twitter:description" content="seed twitter description" />
    <meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />
    <meta name="twitter:image:alt" content="${DEFAULT_OG_IMAGE_ALT}" />
    <link rel="canonical" href="${ORIGIN}/" />
  `;
}

// --- Route fixtures -------------------------------------------------------
// Each mirrors how the real page calls useSeo, including the 404 route's
// deliberate noindex.

function Home() {
  useSeo({ ...ROUTE_SEO["/"] });
  return <Link to="/pricing">to pricing</Link>;
}

function Pricing() {
  useSeo({ ...ROUTE_SEO["/pricing"] });
  return <Link to="/docs">to docs</Link>;
}

function Docs() {
  useSeo({ ...ROUTE_SEO["/docs"] });
  return <Link to="/missing">to 404</Link>;
}

function NotFound() {
  useSeo({ title: "Page not found — LinkShift", robots: "noindex,nofollow" });
  return <Link to="/">to home</Link>;
}

function renderRoutes(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  seedDocument();
});

afterEach(() => {
  cleanup();
});

describe("applySeo writes the full managed set", () => {
  it("sets title, description, canonical and robots", () => {
    applySeo(ROUTE_SEO["/pricing"]);

    expect(document.title).toBe(ROUTE_SEO["/pricing"].title);
    expect(named("description")).toBe(ROUTE_SEO["/pricing"].description);
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      `${ORIGIN}/pricing`,
    );
    // No robots config on this route → the tag must not exist at all.
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("sets the Open Graph block including the image", () => {
    applySeo(ROUTE_SEO["/pricing"]);

    expect(og("og:title")).toBe(ROUTE_SEO["/pricing"].title);
    expect(og("og:description")).toBe(ROUTE_SEO["/pricing"].description);
    expect(og("og:url")).toBe(`${ORIGIN}/pricing`);
    expect(og("og:image")).toBe(DEFAULT_OG_IMAGE);
    expect(og("og:image:alt")).toBe(DEFAULT_OG_IMAGE_ALT);
    expect(og("og:image:width")).toBe("1200");
    expect(og("og:image:height")).toBe("630");
    expect(og("og:image:type")).toBe("image/png");
    expect(og("og:locale")).toBe(OG_LOCALE);
    expect(og("og:site_name")).toBe("LinkShift");
    expect(og("og:type")).toBe("website");
  });

  it("sets the twitter card block", () => {
    applySeo(ROUTE_SEO["/faq"]);

    expect(named("twitter:card")).toBe("summary_large_image");
    expect(named("twitter:title")).toBe(ROUTE_SEO["/faq"].title);
    expect(named("twitter:description")).toBe(ROUTE_SEO["/faq"].description);
    expect(named("twitter:image")).toBe(DEFAULT_OG_IMAGE);
    expect(named("twitter:image:alt")).toBe(DEFAULT_OG_IMAGE_ALT);
  });

  it("honours a per-route ogImage override", () => {
    const custom = `${ORIGIN}/brand/custom-card.png`;
    applySeo({ title: "T", description: "D", canonicalPath: "/x", ogImage: custom, ogImageAlt: "Custom alt" });

    expect(og("og:image")).toBe(custom);
    expect(named("twitter:image")).toBe(custom);
    expect(og("og:image:alt")).toBe("Custom alt");
  });

  it("falls back to the default card when no ogImage is given", () => {
    applySeo({ title: "T", canonicalPath: "/y" });
    expect(og("og:image")).toBe(DEFAULT_OG_IMAGE);
  });
});

describe("repeated application does not duplicate tags", () => {
  it("keeps exactly one of each managed tag across many calls", () => {
    for (let i = 0; i < 5; i += 1) {
      applySeo({ ...ROUTE_SEO["/"], canonicalPath: "/" });
    }

    for (const prop of [
      "og:title",
      "og:description",
      "og:url",
      "og:image",
      "og:image:alt",
      "og:locale",
      "og:site_name",
      "og:type",
    ]) {
      expect(countManaged(prop), prop).toBe(1);
    }
    for (const name of [
      "description",
      "twitter:card",
      "twitter:title",
      "twitter:description",
      "twitter:image",
      "twitter:image:alt",
    ]) {
      expect(document.head.querySelectorAll(`meta[name="${name}"]`).length, name).toBe(1);
    }
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
  });

  it("collapses duplicates that already exist in the document", () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      `<meta property="og:image" content="https://stale.example/a.png" />
       <meta property="og:image" content="https://stale.example/b.png" />`,
    );

    applySeo({ ...ROUTE_SEO["/"], canonicalPath: "/" });

    expect(countManaged("og:image")).toBe(1);
    expect(og("og:image")).toBe(DEFAULT_OG_IMAGE);
  });

  it("removes a name-keyed tag that would shadow the property-keyed one", () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      `<meta name="og:image" content="https://stale.example/shadow.png" />`,
    );

    applySeo({ ...ROUTE_SEO["/"], canonicalPath: "/" });

    expect(countManaged("og:image")).toBe(1);
    expect(og("og:image")).toBe(DEFAULT_OG_IMAGE);
  });
});

describe("SPA navigation: home → pricing → docs → 404 → home", () => {
  it("replaces og metadata on every hop rather than accumulating it", () => {
    const { getByText } = renderRoutes("/");

    const click = (text: string) => {
      // Wrapped in act() so React flushes the route change and the useSeo
      // effect before the assertions run.
      act(() => {
        fireEvent.click(getByText(text));
      });
    };

    // --- home ---
    expect(og("og:title")).toBe(ROUTE_SEO["/"].title);
    expect(og("og:url")).toBe(`${ORIGIN}/`);
    expect(og("og:image")).toBe(DEFAULT_OG_IMAGE);
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();

    // --- pricing ---
    click("to pricing");
    expect(document.title).toBe(ROUTE_SEO["/pricing"].title);
    expect(og("og:title")).toBe(ROUTE_SEO["/pricing"].title);
    expect(og("og:description")).toBe(ROUTE_SEO["/pricing"].description);
    expect(og("og:url")).toBe(`${ORIGIN}/pricing`);
    expect(named("twitter:title")).toBe(ROUTE_SEO["/pricing"].title);
    // The homepage title must be gone, not merely shadowed.
    expect(og("og:title")).not.toBe(ROUTE_SEO["/"].title);
    expect(countManaged("og:title")).toBe(1);

    // --- docs ---
    click("to docs");
    expect(og("og:title")).toBe(ROUTE_SEO["/docs"].title);
    expect(og("og:url")).toBe(`${ORIGIN}/docs`);
    expect(named("twitter:description")).toBe(ROUTE_SEO["/docs"].description);
    expect(countManaged("og:url")).toBe(1);

    // --- 404 (noindex) ---
    click("to 404");
    expect(document.title).toBe("Page not found — LinkShift");
    expect(named("robots")).toBe("noindex,nofollow");
    // The 404 route passes no canonicalPath, so setCanonical falls back to
    // window.location.pathname — which in a real browser yields the 404 URL,
    // and under the memory router is whatever jsdom reports. What matters is
    // that the previous route's canonical did not survive.
    expect(og("og:url")).not.toBe(`${ORIGIN}/docs`);
    expect(og("og:title")).toBe("Page not found — LinkShift");

    // --- back home: the noindex must NOT survive ---
    click("to home");
    expect(document.title).toBe(ROUTE_SEO["/"].title);
    expect(
      document.head.querySelector('meta[name="robots"]'),
      "noindex survived navigation away from the 404 page",
    ).toBeNull();
    expect(og("og:url")).toBe(`${ORIGIN}/`);

    // Across the whole journey no managed tag accumulated.
    for (const prop of ["og:title", "og:description", "og:url", "og:image"]) {
      expect(countManaged(prop), prop).toBe(1);
    }
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
  });
});

describe("head-scoped mutation", () => {
  it("ignores lookalike tags outside the head", () => {
    // React hoists <meta>/<link> out of the component tree (they are valid
    // only in <head>), so the realistic lookalike is a tag that already lives
    // outside head — e.g. injected by a third-party script or a devtools
    // preview. Those must not be treated as manageable.
    const body = document.createElement("div");
    body.innerHTML = `
      <meta name="twitter:card" content="do-not-touch" />
      <link rel="canonical" href="https://example.invalid/in-page" />
    `;
    document.body.appendChild(body);

    applySeo({ ...ROUTE_SEO["/pricing"], canonicalPath: "/pricing" });

    expect(body.querySelector('meta[name="twitter:card"]')?.getAttribute("content")).toBe(
      "do-not-touch",
    );
    expect(body.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      "https://example.invalid/in-page",
    );

    // The head copies are correct and singular — the body copies were neither
    // counted nor rewritten.
    expect(named("twitter:card")).toBe("summary_large_image");
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);

    body.remove();
  });
});

describe("json-ld is replaced, not accumulated", () => {
  it("keeps a single managed block and swaps its content", () => {
    applySeo({ title: "A", jsonLd: { "@type": "One" } });
    applySeo({ title: "B", jsonLd: { "@type": "Two" } });

    const blocks = document.head.querySelectorAll('script[type="application/ld+json"][data-seo]');
    expect(blocks.length).toBe(1);
    expect(blocks[0].textContent).toContain('"@type":"Two"');
  });

  it("removes the block when a route supplies none", () => {
    applySeo({ title: "A", jsonLd: { "@type": "One" } });
    applySeo({ title: "B", jsonLd: null });

    expect(document.head.querySelectorAll('script[type="application/ld+json"][data-seo]').length).toBe(0);
  });
});
