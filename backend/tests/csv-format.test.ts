import { describe, expect, it } from "vitest";
import { CSV_HEADERS, formatScanRow } from "../src/features/dashboard/csv.service";

const SAMPLE = {
    scannedAt: new Date("2026-08-23T10:00:00.000Z"),
    utmSource: "newsletter",
    utmMedium: null,
    utmCampaign: "launch",
    utmTerm: null,
    utmContent: null,
    browser: "Chrome",
    device: null,
    os: "Windows",
    country: "IN",
    city: "Mumbai",
    ipAddress: "203.0.113.9",
};

describe("CSV export formatting", () => {
    it("exposes the documented header set", () => {
        expect(CSV_HEADERS[0]).toBe("Scanned At");
        expect(CSV_HEADERS).toContain("IP Address");
        expect(CSV_HEADERS).toHaveLength(14);
    });

    it("formats a scan row with quoted CSV fields", () => {
        const row = formatScanRow(SAMPLE as never);
        expect(row).toContain('"2026-08-23T10:00:00.000Z"');
        expect(row).toContain('"newsletter"');
        expect(row).toContain('"Chrome"');
        expect(row).toContain('"203.0.113.9"');
    });

    it("escapes embedded quotes (CSV injection-safe output)", () => {
        const row = formatScanRow({ ...SAMPLE, city: 'Mu"mbai' } as never);
        expect(row).toContain('"Mu""mbai"');
    });

    it("renders null values as bare empty fields (escapeCsvValue contract)", () => {
        const row = formatScanRow({ ...SAMPLE, utmSource: null, utmMedium: null, utmCampaign: "launch" } as never);
        // utmSource/utmMedium are null → consecutive empty fields before "launch"
        expect(row).toContain(',,,"launch"');
    });
});
