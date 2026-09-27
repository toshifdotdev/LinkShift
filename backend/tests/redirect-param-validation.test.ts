import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Regression coverage for redirectParamSchema (redirect layer slug validation).
//
// Root cause (fixed): the schema previously enforced exactly 7 characters
// (min(7).max(7)), which rejected legitimate custom slugs shorter or longer
// than 7 characters despite the create/update rule allowing 3–50.
//
// Hermetic: pure Zod schema invocation — no HTTP server, no database.
// ---------------------------------------------------------------------------

import { redirectParamSchema } from "../src/features/redirect/redirect.validation";

describe("redirectParamSchema – 3–50 slug rule", () => {
    // --- Valid slugs ---

    it("accepts a 3-character slug (minimum boundary)", () => {
        const result = redirectParamSchema.safeParse({ shortId: "abc" });
        expect(result.success).toBe(true);
    });

    it("accepts a 5-character slug such as 'krish'", () => {
        const result = redirectParamSchema.safeParse({ shortId: "krish" });
        expect(result.success).toBe(true);
    });

    it("accepts a 7-character slug (formerly the only valid length)", () => {
        const result = redirectParamSchema.safeParse({ shortId: "abcdefg" });
        expect(result.success).toBe(true);
    });

    it("accepts a 50-character slug (maximum boundary)", () => {
        const slug = "a".repeat(50);
        const result = redirectParamSchema.safeParse({ shortId: slug });
        expect(result.success).toBe(true);
    });

    it("accepts hyphens in the slug", () => {
        const result = redirectParamSchema.safeParse({ shortId: "my-link" });
        expect(result.success).toBe(true);
    });

    it("accepts underscores in the slug", () => {
        const result = redirectParamSchema.safeParse({ shortId: "my_slug" });
        expect(result.success).toBe(true);
    });

    it("accepts alphanumeric slugs", () => {
        const result = redirectParamSchema.safeParse({ shortId: "toshif" });
        expect(result.success).toBe(true);
    });

    it("accepts mixed-case slugs with digits and special allowed chars", () => {
        const result = redirectParamSchema.safeParse({ shortId: "My_Link-2" });
        expect(result.success).toBe(true);
    });

    // --- Invalid slugs ---

    it("rejects a 1-character slug", () => {
        const result = redirectParamSchema.safeParse({ shortId: "a" });
        expect(result.success).toBe(false);
    });

    it("rejects a 2-character slug", () => {
        const result = redirectParamSchema.safeParse({ shortId: "ab" });
        expect(result.success).toBe(false);
    });

    it("rejects a 51-character slug (exceeds maximum)", () => {
        const slug = "a".repeat(51);
        const result = redirectParamSchema.safeParse({ shortId: slug });
        expect(result.success).toBe(false);
    });

    it("rejects slugs containing a dot", () => {
        const result = redirectParamSchema.safeParse({ shortId: "bad.slug" });
        expect(result.success).toBe(false);
    });

    it("rejects slugs containing a forward slash", () => {
        const result = redirectParamSchema.safeParse({ shortId: "bad/slug" });
        expect(result.success).toBe(false);
    });

    it("rejects slugs containing a space", () => {
        const result = redirectParamSchema.safeParse({ shortId: "bad slug" });
        expect(result.success).toBe(false);
    });

    it("rejects slugs containing a percent sign", () => {
        const result = redirectParamSchema.safeParse({ shortId: "bad%slug" });
        expect(result.success).toBe(false);
    });

    it("rejects an empty slug", () => {
        const result = redirectParamSchema.safeParse({ shortId: "" });
        expect(result.success).toBe(false);
    });
});
