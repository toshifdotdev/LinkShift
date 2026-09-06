import { afterEach, describe, expect, it } from "vitest";
import { storageIp } from "../src/utils/ipPrivacy";

const ORIGINAL = process.env.SCAN_IP_PRIVACY;
afterEach(() => {
    process.env.SCAN_IP_PRIVACY = ORIGINAL;
});

describe("storageIp privacy truncation", () => {
    it("truncates IPv4 to /24 by default", () => {
        delete process.env.SCAN_IP_PRIVACY;
        expect(storageIp("203.0.113.9")).toBe("203.0.113.0");
        expect(storageIp("203.0.113.0")).toBe("203.0.113.0");
    });

    it("truncates IPv6 host bits (/48-style) by default", () => {
        delete process.env.SCAN_IP_PRIVACY;
        expect(storageIp("2001:db8:1234:5678::1")).toBe("2001:db8:1234::");
        expect(storageIp("2001:db8:1234:5678:1:2:3:4")).toBe("2001:db8:1234::");
        // mapped IPv4-in-IPv6 degrades to a truncated v4 tail
        expect(storageIp("::ffff:203.0.113.9")).toBe("::ffff:203.0.113.0");
    });

    it("full mode stores the exact address", () => {
        process.env.SCAN_IP_PRIVACY = "full";
        expect(storageIp("203.0.113.9")).toBe("203.0.113.9");
        expect(storageIp("2001:db8:1234:5678::1")).toBe("2001:db8:1234:5678::1");
    });

    it("null/undefined stay null in every mode", () => {
        process.env.SCAN_IP_PRIVACY = "truncated";
        expect(storageIp(null)).toBeNull();
        expect(storageIp(undefined)).toBeNull();
        process.env.SCAN_IP_PRIVACY = "full";
        expect(storageIp(null)).toBeNull();
        expect(storageIp(undefined)).toBeNull();
    });

    it("unknown shapes pass through rather than corrupt data", () => {
        delete process.env.SCAN_IP_PRIVACY;
        expect(storageIp("not-an-ip")).toBe("not-an-ip");
    });
});
