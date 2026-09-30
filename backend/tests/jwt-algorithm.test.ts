import { describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

/**
 * Regression coverage for JWT algorithm pinning.
 *
 * `authMiddleWare` called `jwt.verify(token, secret)` with no `algorithms`
 * allow-list, leaving the verifier free to honour whatever algorithm the
 * token's own header declares. Pinning to HS256 — the only algorithm the
 * server ever signs with — rejects `alg: none` and RS256 key-confusion tokens
 * outright, while leaving genuinely valid HS256 tokens working unchanged.
 *
 * `config` is mocked so this suite stays hermetic: it never opens a database
 * connection, and the signing secret is defined here rather than read from the
 * developer's local .env.
 */
const { config } = vi.hoisted(() => ({
    config: { jwtSecret: "test-secret-value-for-jwt-suite" },
}));

vi.mock(import("../src/config"), () => ({ config }));

const { authMiddleWare } = await import("../src/middleware/auth.middleware");
const { generateAccessToken, JWT_ALGORITHM } = await import("../src/utils/jwt");

const PAYLOAD = { id: "user-1", email: "user@example.com" };
const SECRET = "test-secret-value-for-jwt-suite";

const b64url = (input: object) => Buffer.from(JSON.stringify(input)).toString("base64url");

/** A token whose header claims an algorithm the server never signs with. */
const forgeWithAlg = (alg: string, signature = ""): string =>
    [b64url({ alg, typ: "JWT" }), b64url(PAYLOAD), signature].join(".");

const authorize = (token?: string) => {
    const req = {
        headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
    } as never;
    const next = vi.fn();
    authMiddleWare(req, {} as never, next);
    const err = next.mock.calls[0]?.[0] as { statusCode?: number; message?: string } | undefined;
    return { req, next, err };
};

const user = { id: "user-1", email: "user@example.com" };

describe("access tokens the server issues", () => {
    it("signs with HS256", () => {
        const token = generateAccessToken(user as never);
        const header = JSON.parse(
            Buffer.from(token.split(".")[0], "base64url").toString("utf8"),
        );

        expect(header.alg).toBe("HS256");
        expect(JWT_ALGORITHM).toBe("HS256");
    });

    it("still authenticates a token it issued", () => {
        const token = generateAccessToken(user as never);
        const { req, next } = authorize(token);

        expect(next).toHaveBeenCalledWith();
        expect((req as { auth?: { id: string; email: string } }).auth).toEqual({
            id: "user-1",
            email: "user@example.com",
        });
    });
});

describe("authMiddleWare rejects unexpected algorithms", () => {
    it("rejects an unsigned alg:none token", () => {
        const { err, next } = authorize(forgeWithAlg("none"));

        expect(err?.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalledWith();
    });

    it("rejects an RS256 token (algorithm confusion)", () => {
        // Correctly HMAC-signed payload, but the header claims RS256.
        const signature = jwt
            .sign(PAYLOAD, SECRET, { algorithm: "HS256", expiresIn: "15m" })
            .split(".")[2];

        const { err } = authorize(forgeWithAlg("RS256", signature));

        expect(err?.statusCode).toBe(401);
    });

    it("rejects an HS384 token even though the secret is correct", () => {
        const token = jwt.sign(PAYLOAD, SECRET, { algorithm: "HS384", expiresIn: "15m" });

        expect(authorize(token).err?.statusCode).toBe(401);
    });

    it("rejects a token signed with the wrong secret", () => {
        const token = jwt.sign(PAYLOAD, "not-the-secret", { expiresIn: "15m" });

        expect(authorize(token).err?.statusCode).toBe(401);
    });

    it("rejects a token with no subject id", () => {
        const token = jwt.sign({ email: "user@example.com" }, SECRET, { expiresIn: "15m" });

        expect(authorize(token).err?.statusCode).toBe(401);
    });

    it("still reports expiry as 401 rather than a server error", () => {
        const token = jwt.sign(PAYLOAD, SECRET, { expiresIn: "-1s" });

        const { err } = authorize(token);

        expect(err?.statusCode).toBe(401);
        expect(err?.message).toMatch(/expired/i);
    });

    it("rejects a missing Authorization header", () => {
        expect(authorize(undefined).err?.statusCode).toBe(401);
    });

    it("rejects a bearer header with no token", () => {
        const next = vi.fn();
        authMiddleWare({ headers: { authorization: "Bearer" } } as never, {} as never, next);

        const err = next.mock.calls[0]?.[0] as { statusCode?: number } | undefined;
        expect(err?.statusCode).toBe(401);
    });
});