import { describe, expect, it } from "vitest";

const linkIdSchema = { safeParse: (v: unknown) => ({ success: true, data: v }) } as never;

const read = (file: string) =>
    require("node:fs").readFileSync(
        require("node:path").join(__dirname, "..", "..", file),
        "utf8"
    ) as string;

describe("tags: the feature is discoverable in the docs", () => {
    const docs = read("frontend/src/pages/docs/docs-data.ts");

    it("documents tags somewhere a reader will find them", () => {
        // Tags exist because an owner with hundreds of links cannot use a flat
        // list. Leaving them undocumented means shipping the feature and
        // leaving nobody to discover it.
        expect(docs).toMatch(/tag/i);
    });

    it("states that tags are for grouping and filtering", () => {
        expect(docs).toMatch(/group/i);
    });
});

describe("tags: the API contract the client depends on", () => {
    const schema = read("backend/src/features/tag/tag.validation.ts");
    const routes = read("backend/src/features/tag/tag.routes.ts");

    it("validates a tag id as a cuid2", () => {
        expect(schema).toContain("cuid2");
    });

    it("mounts list, create, rename and delete", () => {
        expect(routes).toContain('router.get("/"');
        expect(routes).toContain('router.post(');
        expect(routes).toContain('router.patch(');
        expect(routes).toContain('router.delete(');
    });

    it("guards every mutating route with auth and a rate limit", () => {
        // A tag list is per-user data. An unauthenticated route would either
        // leak names or 500 on a missing user.
        const mutations = routes.match(/router\.(post|patch|delete)\([\s\S]*?\);/g) ?? [];
        expect(mutations.length).toBeGreaterThanOrEqual(3);

        for (const block of mutations) {
            expect(block).toContain("authMiddleWare");
            expect(block).toContain("linkMutationLimiter");
        }
    });

    it("requires auth on the list route too", () => {
        expect(routes).toContain('router.get("/", authMiddleWare');
    });
});

describe("tags: the client normalises the same way the server does", () => {
    it("uses one shared constant module rather than duplicating the rule", () => {
        // Two copies of "lower-case and trim" is two copies to forget.
        const constants = read("frontend/src/lib/tag-constants.ts");
        const picker = read("frontend/src/pages/app/links/tag-picker.tsx");

        expect(constants).toContain("toLowerCase");
        expect(picker).toContain("normaliseTagName");
    });

    it("bounds a tag name to the same length the server accepts", () => {
        expect(read("frontend/src/lib/tag-constants.ts")).toContain(
            "MAX_TAG_NAME_LENGTH = 30"
        );
        expect(read("backend/src/features/tag/tag.service.ts")).toContain(
            "MAX_TAG_NAME_LENGTH = 30"
        );
    });
});