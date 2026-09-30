import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const BACKEND_ROOT = join(__dirname, "..");
const schema = readFileSync(join(BACKEND_ROOT, "prisma", "schema.prisma"), "utf8");
const dashboardService = readFileSync(
    join(BACKEND_ROOT, "src", "features", "dashboard", "dashboard.service.ts"),
    "utf8"
);
const billingService = readFileSync(
    join(BACKEND_ROOT, "src", "features", "billing", "billing.service.ts"),
    "utf8"
);
const csvService = readFileSync(
    join(BACKEND_ROOT, "src", "features", "dashboard", "csv.service.ts"),
    "utf8"
);

const MIGRATION_DIR = "20260930160000_scan_owner_scope_click_indexes";
const migration = readFileSync(
    join(BACKEND_ROOT, "prisma", "migrations", MIGRATION_DIR, "migration.sql"),
    "utf8"
);

function scanModel(): string {
    const start = schema.indexOf("model Scan {");
    expect(start).toBeGreaterThan(-1);
    return schema.slice(start, schema.indexOf("\n}", start));
}

describe("Scan indexes", () => {
    it("indexes owner-scoped click queries on (isBot, scannedAt)", () => {
        expect(scanModel()).toContain("@@index([isBot, scannedAt])");
    });

    it("keeps the per-link click index for link-scoped analytics", () => {
        
        
        expect(scanModel()).toContain("@@index([linkId, isBot, scannedAt])");
    });

    it("keeps (linkId, scannedAt) because the CSV export includes bots", () => {
        
        
        expect(csvService).not.toMatch(/where:\s*\{[^}]*isBot/);
        expect(scanModel()).toContain("@@index([linkId, scannedAt])");
    });

    it("keeps the owner join cheap via Link.userId", () => {
        
        
        expect(schema).toContain("@@index([userId])");
    });
});

describe("owner-scoped Scan queries stay index-aligned", () => {
    it("filters isBot in every dashboard raw SQL series", () => {
        
        
        
        
        
        
        
        const scanQueries = [
            ...dashboardService.matchAll(/`([^`]*)`/g),
        ]
            .map((m) => m[1])
            .filter((q) => q.includes('FROM "Scan"'));

        expect(scanQueries.length).toBeGreaterThan(0);

        for (const query of scanQueries) {
            expect(query).toMatch(/"isBot"\s*=\s*false/);
        }
    });

    it("counts human clicks in quota and billing usage", () => {
        
        
        
        expect(billingService).toMatch(/isBot:\s*false[\s\S]{0,400}?scannedAt/);
    });

    it("reports bot requests separately without inflating the human count", () => {
        
        
        
        expect(billingService).toMatch(/isBot:\s*true/);
    });
});

describe(`${MIGRATION_DIR} is additive and safe for existing data`, () => {
    it("only creates an index", () => {
        
        
        const statements = migration
            .split("\n")
            .filter((line) => !line.trim().startsWith("--"))
            .join("\n")
            .split(";")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

        expect(statements).toHaveLength(1);
        expect(statements[0]).toMatch(/^CREATE INDEX/i);
    });

    it("performs no destructive or data-rewriting operation", () => {
        expect(migration).not.toMatch(/\bDROP\b/i);
        expect(migration).not.toMatch(/\bALTER\b/i);
        expect(migration).not.toMatch(/\bUPDATE\b/i);
        expect(migration).not.toMatch(/\bDELETE\b/i);
        expect(migration).not.toMatch(/\bTRUNCATE\b/i);
        expect(migration).not.toMatch(/\bREINDEX\b/i);
    });

    it("creates the exact index name declared in the schema", () => {
        expect(migration).toContain('"Scan_isBot_scannedAt_idx"');
        expect(migration).toContain('ON "Scan"("isBot", "scannedAt")');
    });
});