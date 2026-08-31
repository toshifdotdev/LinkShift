import { createHash } from "crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock(import("../src/config"), () => ({
    config: { node_env: "test" },
}));

import type { Request, Response } from "express";
import {
    OAUTH_STATE_COOKIE,
    STATE_COOKIE_PATH,
    clearOAuthStateCookie,
    oauthStateStore,
} from "../src/features/auth/oauthState";

const hashState = (state: string) =>
    createHash("sha256").update(state).digest("hex");

function makeRes() {
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const cleared: Array<{ name: string; options?: Record<string, unknown> }> = [];
    const res = {
        cookie: vi.fn((name: string, value: string, options: Record<string, unknown>) => {
            cookies.push({ name, value, options });
        }),
        clearCookie: vi.fn((name: string, options?: Record<string, unknown>) => {
            cleared.push({ name, options });
        }),
    } as unknown as Response;
    return { res, cookies, cleared };
}

function makeReq(cookies: Record<string, string> = {}, res?: Response) {
    return { cookies, res } as unknown as Request;
}

function storeState(req: Request): Promise<{ err: Error | null; state?: string }> {
    return new Promise((resolve) => {
        oauthStateStore.store(req, (err, state) => resolve({ err, state }));
    });
}

function verifyState(req: Request, state: unknown): Promise<{ err: Error | null; ok: boolean }> {
    return new Promise((resolve) => {
        oauthStateStore.verify(req, state as string, (err, ok) => resolve({ err, ok }));
    });
}

describe("OAuth state store", () => {
    it("issues a random state and stores only its hash in the cookie", async () => {
        const { res, cookies } = makeRes();
        const result = await storeState(makeReq({}, res));

        expect(result.err).toBeNull();
        expect(result.state).toMatch(/^[A-Za-z0-9_-]{32}$/);
        expect(cookies).toHaveLength(1);
        expect(cookies[0].name).toBe(OAUTH_STATE_COOKIE);
        expect(cookies[0].value).toBe(hashState(result.state!));
        expect(cookies[0].options).toMatchObject({
            httpOnly: true,
            sameSite: "lax",
            path: STATE_COOKIE_PATH,
            maxAge: 10 * 60 * 1000,
        });
    });

    it("never puts the raw state into the cookie", async () => {
        const { res, cookies } = makeRes();
        const result = await storeState(makeReq({}, res));
        expect(cookies[0].value).not.toContain(result.state!);
    });

    it("errors through the callback when the response object is unavailable", async () => {
        const result = await storeState(makeReq({}, undefined));
        expect(result.err).toBeInstanceOf(Error);
        expect(result.state).toBeUndefined();
    });

    it("accepts a state whose hash matches the stored cookie", async () => {
        const { res, cookies, cleared } = makeRes();
        const issued = await storeState(makeReq({}, res));

        const req = makeReq({ [OAUTH_STATE_COOKIE]: cookies[0].value }, res);
        const result = await verifyState(req, issued.state);

        expect(result.err).toBeNull();
        expect(result.ok).toBe(true);
        // One-shot: the cookie is consumed during verification.
        expect(cleared).toEqual([{ name: OAUTH_STATE_COOKIE, options: { path: STATE_COOKIE_PATH } }]);
    });

    it("rejects a forged state even when the cookie exists", async () => {
        const { res, cookies } = makeRes();
        await storeState(makeReq({}, res));

        const req = makeReq({ [OAUTH_STATE_COOKIE]: cookies[0].value }, res);
        const result = await verifyState(req, "forged-state-value");
        expect(result.ok).toBe(false);
    });

    it("rejects when the state cookie is missing (expired or never issued)", async () => {
        const { res } = makeRes();
        const result = await verifyState(makeReq({}, res), "any-state");
        expect(result.ok).toBe(false);
    });

    it("rejects an empty or absent state parameter", async () => {
        const { res } = makeRes();
        expect((await verifyState(makeReq({ [OAUTH_STATE_COOKIE]: "x" }, res), "")).ok).toBe(false);
        expect((await verifyState(makeReq({ [OAUTH_STATE_COOKIE]: "x" }, res), undefined)).ok).toBe(false);
    });

    it("rejects cookie values of an unexpected length without throwing", async () => {
        const { res } = makeRes();
        const result = await verifyState(
            makeReq({ [OAUTH_STATE_COOKIE]: "short" }, res),
            "any-state"
        );
        expect(result.ok).toBe(false);
    });

    it("consumes the cookie even when verification fails", async () => {
        const { res, cleared } = makeRes();
        const req = makeReq({ [OAUTH_STATE_COOKIE]: "stale-hash" }, res);
        await verifyState(req, "any-state");
        expect(cleared).toHaveLength(1);
    });

    it("clearOAuthStateCookie targets the scoped cookie path", () => {
        const { res, cleared } = makeRes();
        clearOAuthStateCookie(res);
        expect(cleared).toEqual([{ name: OAUTH_STATE_COOKIE, options: { path: STATE_COOKIE_PATH } }]);
    });
});
