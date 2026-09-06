import { describe, expect, it } from "vitest";
import { extractVisitorInfo } from "../src/features/redirect/visitor.service";

function reqWith(headers: Record<string, string>) {
    return { headers, ip: "203.0.113.7" } as never;
}

describe("extractVisitorInfo referrer capture", () => {
    it("reads the standard 'referer' spelling", () => {
        const info = extractVisitorInfo(
            reqWith({ referer: "https://news.example.com/article" })
        );
        expect(info.referrer).toBe("https://news.example.com/article");
    });

    it("accepts the common 'referrer' misspelling too", () => {
        const info = extractVisitorInfo(
            reqWith({ referrer: "https://social.example.com/post" })
        );
        expect(info.referrer).toBe("https://social.example.com/post");
    });

    it("returns undefined when absent", () => {
        const info = extractVisitorInfo(reqWith({}));
        expect(info.referrer).toBeUndefined();
        expect(info.ipAddress).toBe("203.0.113.7");
    });

    it("trims whitespace and caps extreme lengths", () => {
        const long = "https://example.com/" + "a".repeat(5000);
        const info = extractVisitorInfo(reqWith({ referer: `  ${long}  ` }));
        expect(info.referrer!.length).toBeLessThanOrEqual(2048);
        expect(info.referrer!.startsWith("https://example.com/")).toBe(true);
    });
});
