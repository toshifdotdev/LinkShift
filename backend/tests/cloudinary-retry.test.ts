import { describe, expect, it, vi } from "vitest";
import { withRetry } from "../src/utils/retry";

describe("withRetry (Cloudinary upload helper)", () => {
    it("returns the op result on first success", async () => {
        const op = vi.fn(async () => "ok");
        const out = await withRetry("t", op);
        expect(out).toBe("ok");
        expect(op).toHaveBeenCalledTimes(1);
    });

    it("retries up to 3 times on a generic Error then succeeds", async () => {
        let calls = 0;
        const op = vi.fn(async () => {
            calls++;
            if (calls < 3) throw new Error("network blip");
            return "ok";
        });
        const out = await withRetry("t", op);
        expect(out).toBe("ok");
        expect(op).toHaveBeenCalledTimes(3);
    });

    it("surfaces the last error after exhausting attempts", async () => {
        const op = vi.fn(async () => { throw new Error("always fails"); });
        await expect(withRetry("t", op)).rejects.toThrow("always fails");
        expect(op).toHaveBeenCalledTimes(3);
    });

    it("does NOT retry on a 4xx-class error (http_code 400-499)", async () => {
        const err = new Error("bad signature") as Error & { http_code?: number };
        err.http_code = 401;
        const op = vi.fn(async () => { throw err; });
        await expect(withRetry("t", op)).rejects.toBe(err);
        expect(op).toHaveBeenCalledTimes(1);
    });

    it("retries on a 5xx-class error (http_code 500+)", async () => {
        let calls = 0;
        const err = new Error("upstream 503") as Error & { http_code?: number };
        err.http_code = 503;
        const op = vi.fn(async () => {
            calls++;
            if (calls === 1) throw err;
            return "ok";
        });
        const out = await withRetry("t", op);
        expect(out).toBe("ok");
        expect(op).toHaveBeenCalledTimes(2);
    });
});
