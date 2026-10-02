import { describe, expect, it } from "vitest";
import { hasLinkPreview, renderLinkPreview } from "../src/features/link/linkPreview";
import { isSocialPreviewRequest } from "../src/utils/botDetection";

const base = {
    shortUrl: "https://go.linkshift.in/launch",
    title: "Launch week",
    siteName: "go.linkshift.in",
};

describe("link preview: rendering", () => {
    it("emits the Open Graph tags chat apps read", () => {
        const html = renderLinkPreview({
            ...base,
            description: "Everything in one place",
            imageUrl: "https://cdn.example.com/card.png",
        });

        expect(html).toContain('<meta property="og:title" content="Launch week">');
        expect(html).toContain('<meta property="og:description" content="Everything in one place">');
        expect(html).toContain('<meta property="og:image" content="https://cdn.example.com/card.png">');
        expect(html).toContain('<meta property="og:url" content="https://go.linkshift.in/launch">');
        expect(html).toContain('<meta property="og:type" content="website">');
    });

    it("emits twitter tags too, since X does not always read og:", () => {
        const html = renderLinkPreview({ ...base, imageUrl: "https://cdn.example.com/card.png" });

        expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
        expect(html).toContain('<meta name="twitter:title" content="Launch week">');
    });

    it("downgrades to a small card when there is no image", () => {
        const html = renderLinkPreview({ ...base });

        expect(html).toContain('<meta name="twitter:card" content="summary">');
        expect(html).not.toContain("og:image");
    });

    it("omits description tags entirely when there is none", () => {
        const html = renderLinkPreview({ ...base });

        expect(html).not.toContain("og:description");
    });

    it("truncates a long description rather than emitting it whole", () => {
        const html = renderLinkPreview({ ...base, description: "x".repeat(1000) });

        expect(html).toContain("x".repeat(300));
        expect(html).not.toContain("x".repeat(301));
    });

    it("tells crawlers not to index the card", () => {
        // The card is served from the short-link domain. Indexing it would put
        // thin duplicate pages in the search index for every shared link.
        expect(renderLinkPreview({ ...base })).toContain('content="noindex, nofollow"');
    });
});

describe("link preview: escaping", () => {
    // This document is served from the short-link domain, which is the domain
    // customers are told to trust before clicking. Unescaped owner input here
    // is stored XSS on the most trusted origin in the product.
    it("escapes script tags in the title", () => {
        const html = renderLinkPreview({ ...base, title: '<script>alert(1)</script>' });

        expect(html).not.toContain("<script>alert(1)</script>");
        expect(html).toContain("&lt;script&gt;");
    });

    it("escapes a quote-breakout attempt in the image url", () => {
        const html = renderLinkPreview({
            ...base,
            imageUrl: 'https://cdn.example.com/a.png" onload="alert(1)',
        });

        expect(html).not.toContain('onload="alert(1)"');
        expect(html).toContain("&quot;");
    });

    it("escapes ampersands without double-unescaping", () => {
        const html = renderLinkPreview({ ...base, title: "Tom & Jerry <3" });

        expect(html).toContain("Tom &amp; Jerry &lt;3");
    });

    it("escapes angle brackets in the body copy too", () => {
        const html = renderLinkPreview({ ...base, description: "<img src=x onerror=alert(1)>" });

        expect(html).not.toContain("<img src=x");
        expect(html).toContain("&lt;img");
    });
});

describe("link preview: opt-in", () => {
    it("is absent when the owner set nothing", () => {
        // This is what keeps every existing link behaving exactly as before.
        expect(hasLinkPreview({})).toBe(false);
        expect(hasLinkPreview({ ogTitle: null, ogDescription: null, ogImageUrl: null })).toBe(false);
        expect(hasLinkPreview({ ogTitle: "  " })).toBe(false);
    });

    it("is present once any one field is set", () => {
        expect(hasLinkPreview({ ogTitle: "Launch" })).toBe(true);
        expect(hasLinkPreview({ ogDescription: "Hello" })).toBe(true);
        expect(hasLinkPreview({ ogImageUrl: "https://cdn.example.com/a.png" })).toBe(true);
    });
});

describe("link preview: crawler detection", () => {
    // Reuses the existing social-preview rule, so a link renders as a card on
    // exactly the platforms the bot classifier already recognises.
    it.each([
        "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
        "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        "Twitterbot/1.0",
        "LinkedInBot/1.0 (compatible; Mozilla/5.0)",
        "WhatsApp/2.19.81 A",
        "TelegramBot (like TwitterBot)",
        "Discordbot/2.0",
        "Slack-ImgProxy/1.0",
    ])("treats %s as a preview crawler", (ua) => {
        expect(isSocialPreviewRequest(ua)).toBe(true);
    });

    it.each([
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Version/18.1 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    ])("does not treat a real visitor or other crawler as a preview crawler", (ua) => {
        // Critically, Googlebot must not get a card: it is following links for
        // indexing, not rendering a chat preview, and a 200 HTML response to a
        // crawler is exactly the pattern that gets a shortener deindexed.
        expect(isSocialPreviewRequest(ua)).toBe(false);
    });

    it("handles a missing user agent safely", () => {
        expect(isSocialPreviewRequest(undefined)).toBe(false);
        expect(isSocialPreviewRequest("")).toBe(false);
        expect(isSocialPreviewRequest("   ")).toBe(false);
    });
});