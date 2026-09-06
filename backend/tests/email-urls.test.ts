import { describe, expect, it } from "vitest";
import {
    buildEmailVerificationUrl,
    buildPasswordResetUrl,
} from "../src/utils/emailUrls";

const ORIGIN = "https://app.linkshift.in";
const TOKEN = "abc123def456";

describe("email URL builders", () => {
    it("builds the verification link against the BACKEND origin", () => {
        const url = buildEmailVerificationUrl(ORIGIN, TOKEN);
        expect(url).toBe(`${ORIGIN}/api/v1/auth/verify-email?token=${TOKEN}`);
    });

    it("encodes the verification token", () => {
        const url = buildEmailVerificationUrl(ORIGIN, "a b&c");
        expect(url).toContain("token=a%20b%26c");
    });

    it("builds the reset link against the FRONTEND origin", () => {
        const url = buildPasswordResetUrl("https://linkshift.in", TOKEN);
        expect(url).toBe(`https://linkshift.in/reset-password?token=${TOKEN}`);
    });

    it("never mixes the two origins", () => {
        const verify = buildEmailVerificationUrl("https://api.example.com", TOKEN);
        const reset = buildPasswordResetUrl("https://web.example.com", TOKEN);
        expect(verify.startsWith("https://api.example.com")).toBe(true);
        expect(reset.startsWith("https://web.example.com")).toBe(true);
    });
});
