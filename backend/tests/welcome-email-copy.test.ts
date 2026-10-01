import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Welcome-email copy must not claim capabilities the product does not have.
//
// The email shipped a sentence describing "a URL migration tool [that] moves
// whole path structures with regular expressions". No such tool exists. The
// redirect model is an exact match on (host, shortId) — there is no rules
// engine, no regex, no wildcards and no bulk import. A welcome email is the
// first thing a new customer reads about the product, so a capability claim
// here is worse than a missing feature: it sets an expectation that nothing
// else on the site can meet.
//
// This test reads the rendered HTML rather than the template source, so it
// fails if the claim is reintroduced in any form.
// ---------------------------------------------------------------------------

const sendMock = vi.hoisted(() => vi.fn());

vi.mock(import("resend"), () => ({
    Resend: class {
        emails = { send: sendMock };
    },
}));

vi.mock(import("../src/config"), () => ({
    config: {
        emailFrom: "noreply@test.linkshift.in",
        frontendUrl: "http://localhost:5173",
        APP_URL: "https://linkshift.in",
        resendApiKey: "test-key",
    },
    prisma: {
        emailVerification: {
            deleteMany: async () => ({ count: 0 }),
            create: async () => ({}),
        },
    },
}));

import { sendWelcomeEmail } from "../src/utils/email";

const renderWelcome = async (): Promise<string> => {
    sendMock.mockResolvedValue({ data: { id: "em_welcome" } });
    await sendWelcomeEmail("new@example.com", "Sam");
    return String(sendMock.mock.calls[0][0]?.html ?? "");
};

describe("welcome email content", () => {
    beforeEach(() => {
        sendMock.mockReset();
    });

    it("does not claim a regex or pattern-matching migration tool", async () => {
        const html = await renderWelcome();

        expect(html).not.toMatch(/regular expression/i);
        expect(html).not.toMatch(/\bregex\b/i);
        expect(html).not.toMatch(/wildcard/i);
        expect(html).not.toMatch(/whole path structure/i);
        expect(html).not.toMatch(/URL migration tool/i);
    });

    it("describes migration only in terms the product supports", async () => {
        const html = await renderWelcome();

        // Supported: connect a domain you own, one short key per old path.
        expect(html).toMatch(/connect the domain you already own/i);
        expect(html).toMatch(/short key/i);
    });

    it("still points at the two real setup steps", async () => {
        const html = await renderWelcome();

        expect(html).toContain("https://linkshift.in/app/domains");
        expect(html).toContain("https://linkshift.in/app/links");
        expect(html).toMatch(/Connect a domain/);
        expect(html).toMatch(/Create a link/);
    });

    it("keeps the human-click explanation consistent with analytics behaviour", async () => {
        const html = await renderWelcome();

        expect(html).toMatch(/human clicks/i);
        expect(html).toMatch(/never counted as clicks or billed/i);
    });

    it("does not imply custom domains are available on every plan", async () => {
        // prisma/seed.ts sets maxDomains: 0 on Free, 1 on Starter, 5 on
        // Creator and null (unlimited) on Pro. Telling a brand-new Free
        // account that custom domains are included sends them straight into a
        // dead end on the first email they receive.
        const html = await renderWelcome();

        expect(html).not.toMatch(/custom domains are on every plan/i);
        expect(html).not.toMatch(/custom domains.*every plan/i);
        expect(html).not.toMatch(/on every plan/i);
        expect(html).toMatch(/custom domains start on Starter/i);
    });

    it("sends to the address given and never leaks another recipient", async () => {
        sendMock.mockResolvedValue({ data: { id: "em_welcome" } });
        await sendWelcomeEmail("only@example.com", "Sam");

        const call = sendMock.mock.calls[0][0] as { to: string; subject: string };
        expect(call.to).toBe("only@example.com");
        expect(call.subject).toBe("Welcome to LinkShift");
    });
});
