import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";
import { config } from "../../config";



export const OAUTH_STATE_COOKIE = "google_oauth_state";
export const STATE_COOKIE_PATH = "/api/v1/auth/google";

const STATE_TTL_MS = 10 * 60 * 1000;

const hashState = (state: string): string =>
    createHash("sha256").update(state).digest("hex");

const issueState = (): string => randomBytes(24).toString("base64url");

export const clearOAuthStateCookie = (res: Response): void => {
    res.clearCookie(OAUTH_STATE_COOKIE, { path: STATE_COOKIE_PATH });
};

type StateStoreStoreCallback = (err: Error | null, state?: string) => void;
type StateStoreVerifyCallback = (err: Error | null, ok: boolean, state?: unknown) => void;

export const oauthStateStore = {
    
    
    
    store(
        req: Request,
        metaOrCallback: unknown,
        maybeCallback?: StateStoreStoreCallback
    ): void {
        const callback =
            typeof metaOrCallback === "function"
                ? (metaOrCallback as StateStoreStoreCallback)
                : maybeCallback;
        if (!callback) {
            return;
        }

        const res = req.res;
        if (!res) {
            return callback(new Error("OAuth state store requires req.res."));
        }

        const state = issueState();
        res.cookie(OAUTH_STATE_COOKIE, hashState(state), {
            httpOnly: true,
            secure: config.node_env === "production",
            sameSite: "lax",
            maxAge: STATE_TTL_MS,
            path: STATE_COOKIE_PATH,
        });
        callback(null, state);
    },

    
    
    
    verify(
        req: Request,
        providedState: string,
        metaOrCallback: unknown,
        maybeCallback?: StateStoreVerifyCallback
    ): void {
        const callback =
            typeof metaOrCallback === "function"
                ? (metaOrCallback as StateStoreVerifyCallback)
                : maybeCallback;
        if (!callback) {
            return;
        }

        const cookieValue: unknown = req.cookies?.[OAUTH_STATE_COOKIE];

        
        
        if (req.res) {
            clearOAuthStateCookie(req.res);
        }

        if (typeof providedState !== "string" || providedState.length === 0) {
            return callback(null, false);
        }
        if (typeof cookieValue !== "string" || cookieValue.length === 0) {
            return callback(null, false);
        }

        const expected = Buffer.from(hashState(providedState), "utf8");
        const actual = Buffer.from(cookieValue, "utf8");
        if (expected.length !== actual.length) {
            return callback(null, false);
        }
        callback(null, timingSafeEqual(expected, actual));
    },
};
