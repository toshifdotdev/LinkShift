import { describe, expect, it, vi } from "vitest";

describe("structured logger", () => {
    it("emits a JSON line on stdout/stderr with the expected fields", async () => {
        const writes: string[] = [];
        const origStdout = process.stdout.write.bind(process.stdout);
        const origStderr = process.stderr.write.bind(process.stderr);
        const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
            writes.push(String(chunk));
            return true;
        });
        const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
            writes.push(String(chunk));
            return true;
        });

        // Re-import after env config to keep the test deterministic.
        process.env.LOG_LEVEL = "debug";
        const { log } = await import("../src/utils/logger");
        log.info("test_event", { hello: "world", n: 42 });
        log.error("test_fail", { reason: "boom" });

        stdoutSpy.mockRestore();
        stderrSpy.mockRestore();
        delete process.env.LOG_LEVEL;
        // Restore originals in case the spy didn't catch the writes.
        process.stdout.write = origStdout;
        process.stderr.write = origStderr;

        expect(writes.length).toBe(2);
        const first = JSON.parse(writes[0].trim());
        expect(first.level).toBe("info");
        expect(first.event).toBe("test_event");
        expect(first.hello).toBe("world");
        expect(first.n).toBe(42);
        expect(typeof first.ts).toBe("string");
        const second = JSON.parse(writes[1].trim());
        expect(second.level).toBe("error");
        expect(second.event).toBe("test_fail");
        expect(second.reason).toBe("boom");
    });
});
