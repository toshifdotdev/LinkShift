import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    test: {
        environment: "jsdom",
        include: [
            "src/**/*.test.{ts,tsx}",
            // Build-time and edge artifacts live outside src/ because they use
            // Node built-ins; src/ is compiled with DOM-only types.
            "scripts/**/*.test.ts",
        ],
        setupFiles: ["./src/test/setup.ts"],
        css: false,
    },
});
