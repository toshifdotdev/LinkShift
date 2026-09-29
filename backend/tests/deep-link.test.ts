import { describe, expect, it } from "vitest";
import { applyDeepLink } from "../src/utils/completeRedirect";
import { buildUtmUrl } from "../src/features/utm/utm.service";

/** Express 5 (path-to-regexp v8) delivers `/:shortId/*rest` captures as an
    array of segments; Express 4 gave a string. Both shapes must work. */
function reqWith(rest: string | string[], url: string) {
    return { params: { rest }, url } as never;
}

describe("applyDeepLink path forwarding", () => {
    it("appends the captured path to the destination (array params, Express 5)", () => {
        const result = applyDeepLink(
            "https://example.com/base",
            reqWith(["products", "5"], "/abc/products/5"),
        );
        expect(result).toBe("https://example.com/base/products/5");
    });

    it("appends the captured path (string params)", () => {
        const result = applyDeepLink(
            "https://example.com/base",
            reqWith("products/5", "/abc/products/5"),
        );
        expect(result).toBe("https://example.com/base/products/5");
    });

    it("returns the destination unchanged when nothing was appended", () => {
        const result = applyDeepLink(
            "https://example.com/base",
            reqWith([], "/abc"),
        );
        expect(result).toBe("https://example.com/base");
    });

    it("normalizes trailing slashes on the destination pathname", () => {
        const result = applyDeepLink(
            "https://example.com/base/",
            reqWith(["docs"], "/abc/docs"),
        );
        expect(result).toBe("https://example.com/base/docs");
    });
});

describe("applyDeepLink query forwarding", () => {
    it("merges the visitor's query string onto the destination", () => {
        const result = applyDeepLink(
            "https://example.com/base",
            reqWith(["items"], "/abc/items?foo=bar&ref=x"),
        );
        expect(result).toBe("https://example.com/base/items?foo=bar&ref=x");
    });

    it("appends to an existing query (UTM params survive)", () => {
        const result = applyDeepLink(
            "https://example.com/base?utm_source=newsletter&utm_medium=email",
            reqWith([], "/abc?a=1"),
        );
        const url = new URL(result);
        expect(url.searchParams.get("utm_source")).toBe("newsletter");
        expect(url.searchParams.get("utm_medium")).toBe("email");
        expect(url.searchParams.get("a")).toBe("1");
    });

    it("forwards the query even without an appended path", () => {
        const result = applyDeepLink(
            "https://example.com/base",
            reqWith([], "/abc?foo=bar"),
        );
        expect(result).toBe("https://example.com/base?foo=bar");
    });
});

describe("applyDeepLink safety", () => {
    it("never changes the destination host, whatever the visitor appends", () => {
        const result = applyDeepLink(
            "https://example.com/base",
            reqWith(["evil.com"], "/abc/evil.com?next=https://attacker.example"),
        );
        const url = new URL(result);
        expect(url.host).toBe("example.com");
    });

    it("returns the destination unchanged when it is not a valid URL", () => {
        const result = applyDeepLink(
            "not a url",
            reqWith(["x"], "/abc/x"),
        );
        expect(result).toBe("not a url");
    });
});

/* Campaign tagging and path forwarding are configured separately but meet inside
   one string: createLink/updateLink store buildUtmUrl(destination, tags), and the
   redirect handler later runs applyDeepLink over that stored value. This is the
   only place that composition is pinned end to end. */
describe("UTM tagging composed with path forwarding", () => {
    const stored = buildUtmUrl("https://example.com/base?ref=owner", {
        utmSource: "instagram",
        utmMedium: "social",
        utmCampaign: "spring",
    });

    it("tagging leaves the destination path untouched", () => {
        expect(new URL(stored).pathname).toBe("/base");
        expect(new URL(stored).searchParams.get("ref")).toBe("owner");
    });

    it("forwards the visitor's tail onto the tagged destination in one pass", () => {
        const url = new URL(
            applyDeepLink(stored, reqWith(["products", "5"], "/spring/products/5?ref=qr")),
        );

        expect(url.pathname).toBe("/base/products/5");
        expect(url.searchParams.get("utm_source")).toBe("instagram");
        expect(url.searchParams.get("utm_medium")).toBe("social");
        expect(url.searchParams.get("utm_campaign")).toBe("spring");
        expect(url.searchParams.getAll("ref")).toEqual(["owner", "qr"]);
    });

    it("a visitor's utm_* entry is added alongside the owner's, never in place of it", () => {
        const url = new URL(
            applyDeepLink(stored, reqWith([], "/spring?utm_source=podcast&gclid=abc")),
        );

        expect(url.searchParams.getAll("utm_source")).toEqual(["instagram", "podcast"]);
        expect(url.searchParams.get("gclid")).toBe("abc");
    });

    it("a stale tag inside the saved destination is normalised at rest, leaving only visitor input duplicated", () => {
        const retagged = buildUtmUrl("https://example.com/base?utm_source=stale", {
            utmSource: "newsletter",
        });
        expect(new URL(retagged).searchParams.getAll("utm_source")).toEqual(["newsletter"]);

        const url = new URL(applyDeepLink(retagged, reqWith([], "/spring?utm_source=podcast")));
        expect(url.searchParams.getAll("utm_source")).toEqual(["newsletter", "podcast"]);
    });
});

