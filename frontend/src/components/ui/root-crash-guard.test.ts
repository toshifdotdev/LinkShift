import { describe, expect, it } from "vitest";

// Read sources as text via Vite's `?raw` rather than node:fs. The app tsconfig
// deliberately excludes Node types from src/**, so a test importing node:fs
// here would pass `tsc --noEmit` in isolation but fail the `tsc -b` that the
// production build runs.
import mainSrc from "../../main.tsx?raw";
import guardSrc from "../app/app-with-crash-guard.tsx?raw";

/**
 * The crash guard must sit above every route, not just the authenticated app.
 *
 * The boundary component was written for the app layout and only ever mounted
 * there, which meant a render error on the landing, pricing, docs or status
 * page unmounted the entire tree and showed the visitor a blank page — the
 * worst outcome on the surfaces a crawler and a first-time visitor hit first.
 *
 * This asserts the wiring rather than the component: the component's own
 * behaviour is already covered where it is used in the app layout.
 */

describe("root crash guard wiring", () => {
  it("mounts the guard from the entry point", () => {
    expect(mainSrc).toMatch(
      /import \{ AppWithCrashGuard \} from "@\/components\/app\/app-with-crash-guard"/
    );
    expect(mainSrc).toContain("<AppWithCrashGuard />");
  });

  it("mounts the guard inside the router so useLocation is available", () => {
    // The guard reads useLocation, so it has to render beneath BrowserRouter.
    const routerAt = mainSrc.indexOf("<BrowserRouter>");
    const guardAt = mainSrc.indexOf("<AppWithCrashGuard />");

    expect(routerAt).toBeGreaterThan(-1);
    expect(guardAt).toBeGreaterThan(-1);
    expect(guardAt).toBeGreaterThan(routerAt);
  });

  it("keeps the entry file a bootstrap with no component definitions", () => {
    // main.tsx is the bootstrap. Defining a component there breaks fast-refresh
    // and couples app wiring to the entry file.
    expect(mainSrc).not.toMatch(/^function [A-Z]/m);
    expect(mainSrc).not.toMatch(/^import App from/m);
  });

  it("wraps App, so the guard covers public routes too", () => {
    // The router renders every route, so guarding <App /> is what protects
    // landing, pricing, docs and status — not just the app layout.
    expect(guardSrc).toMatch(
      /<ErrorBoundary resetKey=\{pathname\}>\s*<App \/>\s*<\/ErrorBoundary>/
    );
  });

  it("resets on navigation instead of replaying the crash", () => {
    // Without a resetKey the boundary latches the error and every later route
    // shows the same failure until a manual reload.
    expect(guardSrc).toMatch(/resetKey=\{pathname\}/);
    expect(guardSrc).toMatch(/useLocation/);
    expect(guardSrc).toMatch(/export function AppWithCrashGuard/);
  });

  it("reuses the existing ErrorBoundary rather than a new one", () => {
    expect(guardSrc).toMatch(
      /import \{ ErrorBoundary \} from "@\/components\/ui\/error-boundary"/
    );
  });

  it("does not introduce a second theme or query provider", () => {
    const themes = mainSrc.match(/<ThemeProvider/g) ?? [];
    const queries = mainSrc.match(/<QueryClientProvider/g) ?? [];
    expect(themes).toHaveLength(1);
    expect(queries).toHaveLength(1);
  });
});
