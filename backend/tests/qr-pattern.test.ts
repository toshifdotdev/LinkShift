import { describe, expect, it } from "vitest";
import { createQrSchema } from "../src/features/qr/qr.validation";

describe("createQrSchema pattern styles", () => {
    it("accepts the original pattern values", () => {
        for (const pattern of ["square", "dots", "rounded"]) {
            const res = createQrSchema.safeParse({ pattern });
            expect(res.success).toBe(true);
        }
    });

    it("accepts the qr-code-styling-supported pattern values", () => {
        for (const pattern of ["extraRounded", "classy", "classyRounded"]) {
            const res = createQrSchema.safeParse({ pattern });
            expect(res.success).toBe(true);
            if (res.success) expect(res.data.pattern).toBe(pattern);
        }
    });

    it("rejects unknown pattern values", () => {
        for (const pattern of ["extra-rounded", "bubbles", "cartoon", ""]) {
            const res = createQrSchema.safeParse({ pattern });
            expect(res.success).toBe(false);
        }
    });
});