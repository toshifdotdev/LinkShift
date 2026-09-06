import { describe, expect, it } from "vitest";
import { linkCacheKey } from "../src/utils/cache";

describe("linkCacheKey", () => {
    it("is host-aware (the old bug: invalidation omitted the host)", () => {
        const key = linkCacheKey("go.linkshift.in", "abc1234");
        expect(key).toBe("link:go.linkshift.in:abc1234");
    });

    it("distinguishes hosts for the same shortId", () => {
        expect(linkCacheKey("a.example.com", "xyz")).not.toBe(
            linkCacheKey("b.example.com", "xyz")
        );
    });
});
