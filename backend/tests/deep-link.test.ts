import { describe, expect, it } from "vitest";
import { applyDeepLink } from "../src/utils/completeRedirect";

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
