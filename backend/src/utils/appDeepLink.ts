/**
 * Mobile app deep linking — SDK-less, platform-aware app opening.
 *
 * Mechanisms (the realistic set for a link service that does not own the app):
 *  - Android (Chromium): an `intent://` URL. Chrome opens the app when the
 *    package is installed, otherwise it honors `S.browser_fallback_url`.
 *  - iOS + other mobile browsers: a URI-scheme attempt from an interstitial
 *    page with a timer fallback (installed apps cannot be detected from the
 *    web), plus explicit "Open in app / Continue to website" buttons.
 *  - Desktop: plain redirect to the web fallback.
 *
 * True Universal Links / App Links require apple-app-site-association /
 * assetlinks.json served from the app owner's own domain — LinkShift cannot
 * provide those for third-party apps.
 */

export type AppDeepLinkConfig = {
    appScheme: string;
    androidPackage: string | null;
    appPath: string | null;
    iosStoreUrl: string | null;
    androidStoreUrl: string | null;
};

export type MobilePlatform = "ios" | "android" | null;

export const detectMobilePlatform = (userAgent: string): MobilePlatform => {
    const ua = userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
    if (/Android/i.test(ua)) return "android";
    return null;
};

/* Chromium-based Android browsers understand intent:// URLs. */
export const isAndroidChromium = (userAgent: string): boolean =>
    /Android/i.test(userAgent) && /Chrome\/|CriOS\/|EdgA\//i.test(userAgent);

const normalizePath = (path: string): string =>
    path.replace(/^\/+/, "").replace(/\/+$/, "");

/** Extract the wildcard tail (Express 5 gives an array of segments). */
export const extractRest = (params: Record<string, unknown>): string => {
    const raw = params.rest;
    const segments = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
    return normalizePath(
        segments
            .map((s) => normalizePath(String(s)))
            .filter(Boolean)
            .join("/"),
    );
};

/** Raw query string from the request URL (without the leading "?"). */
export const extractQuery = (reqUrl: string): string =>
    reqUrl.includes("?") ? reqUrl.split("?")[1] : "";

/** Build the in-app target: scheme://appPath/rest?query */
export const buildAppUrl = (
    cfg: AppDeepLinkConfig,
    rest: string,
    query: string,
): string => {
    const base = normalizePath(cfg.appPath ?? "");
    const path = [base, rest].filter(Boolean).join("/");
    return `${cfg.appScheme}://${path}${query ? `?${query}` : ""}`;
};

/** Android Chromium intent:// URL with an encoded browser fallback. */
export const buildIntentUrl = (
    cfg: AppDeepLinkConfig,
    rest: string,
    query: string,
    webFallback: string,
): string => {
    const base = normalizePath(cfg.appPath ?? "");
    const path = [base, rest].filter(Boolean).join("/");
    const fallback = cfg.androidStoreUrl ?? webFallback;
    return (
        `intent://${path}${query ? `?${query}` : ""}` +
        `#Intent;scheme=${cfg.appScheme};` +
        (cfg.androidPackage ? `package=${cfg.androidPackage};` : "") +
        `S.browser_fallback_url=${encodeURIComponent(fallback)};end`
    );
};

const escapeHtml = (s: string): string =>
    s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

/* Embed a config object into a <script> block without injection risk:
   JSON-encode then neutralize "<" so the block can never close early. */
const jsonForScript = (value: unknown): string =>
    JSON.stringify(value).replace(/</g, "\\u003c");

/**
 * Branded interstitial for scheme-based opening (iOS and non-Chromium
 * Android). Auto-attempts the app once on load, falls back after a short
 * timer if the page is still visible (app not installed / scheme refused),
 * and always offers manual buttons.
 */
export const renderAppInterstitial = (opts: {
    platform: "ios" | "android";
    appUrl: string;
    fallbackUrl: string;
    storeUrl?: string | null;
    appName?: string | null;
}): string => {
    const cfg = {
        appUrl: opts.appUrl,
        fallbackUrl: opts.fallbackUrl,
        storeUrl: opts.storeUrl ?? null,
        platform: opts.platform,
    };
    const appLabel = escapeHtml(opts.appName?.trim() || "the app");
    const storeBtn = opts.storeUrl
        ? `\n        <a id="get-app" class="btn" href="#" rel="noopener">Get the app</a>`
        : "";

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="dark" />
<meta name="robots" content="noindex,nofollow" />
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23F9F9F9'/%3E%3Cg transform='translate(8.32,11.4) scale(.4643)' fill='none' stroke='%23141A22' stroke-width='10' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M61.54,60.37L38.87,81.51A13,13,0,0,1,30,85L24,85A19,21.5,0,0,1,24,42L64,42'/%3E%3Cpath d='M39.53,27.27A29,29,0,1,1,77.2,60.3'/%3E%3Cpath d='M66.32,32.4L75.68,40.1Q78,42,75.68,43.9L66.32,51.6Q64,53.5,64,50.5L64,33.5Q64,30.5,66.32,32.4Z' fill='%23141A22' stroke='%23141A22' stroke-width='5' stroke-linejoin='round'/%3E%3C/g%3E%3C/svg%3E" />
<title>LinkShift — Opening app</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #0d0d0d; color: #f5f1eb; min-height: 100vh; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    display: flex; flex-direction: column;
  }
  .wrap { flex: 1; display: grid; place-items: center; padding: 32px 20px; }
  .card { width: 100%; max-width: 30rem; position: relative; }
  .stripe { position: absolute; top: 0; left: 0; right: 0; height: 1px; background: #e8590c; opacity: 0.85; }
  .row { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
  .plate {
    width: 28px; height: 28px; border-radius: 6px; border: 1px solid #262626; background: #111111;
    display: grid; place-items: center; color: #e8590c; flex: 0 0 auto;
  }
  .plate svg { width: 16px; height: 16px; }
  .wordmark { font-family: ui-serif, Georgia, "Times New Roman", serif; font-weight: 600; letter-spacing: -0.01em; font-size: 18px; }
  .kicker {
    font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace;
    color: #e8590c; font-size: 11px; font-weight: 500;
    letter-spacing: 0.18em; text-transform: uppercase;
    margin: 0 0 12px; display: flex; align-items: center; gap: 12px;
  }
  .kicker::before { content: ""; height: 1px; width: 20px; background: rgba(232, 89, 12, 0.4); }
  .headline {
    font-family: ui-serif, Georgia, "Times New Roman", serif; font-weight: 600;
    letter-spacing: -0.02em; margin: 0 0 12px;
    font-size: clamp(1.6rem, 4.5vw, 2.1rem); line-height: 1.12;
  }
  .note { color: #a8a199; font-size: 14px; line-height: 1.55; margin: 0; max-width: 28rem; }
  .actions { margin-top: 28px; display: flex; flex-wrap: wrap; gap: 8px; }
  .btn {
    appearance: none; -webkit-appearance: none; cursor: pointer; text-decoration: none;
    display: inline-flex; align-items: center; justify-content: center;
    height: 36px; padding: 0 16px; border-radius: 6px;
    font: 600 12px/1 ui-monospace, SFMono-Regular, monospace;
    letter-spacing: 0.08em; text-transform: uppercase;
    border: 1px solid #262626; color: #f5f1eb; background: #111111;
  }
  .btn:hover { border-color: #3a3a3a; background: #161616; }
  .btn-primary {
    background: #e8590c; border-color: #9a3d06; color: #ffffff;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 -1px 0 rgba(0, 0, 0, 0.22);
  }
  .btn-primary:hover { background: #f56d1e; }
  .foot { padding: 20px; text-align: center; color: #6b6560; }
  .foot a { color: #a8a199; text-decoration: none; }
  .foot a:hover { color: #f5f1eb; }
</style>
</head>
<body>
  <div class="wrap">
    <main class="card" role="main">
      <span class="stripe" aria-hidden="true"></span>
      <div class="row">
        <span class="plate" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M9.75 7.75H8.25A4.25 4.25 0 0 0 8.25 16.25H9.75" stroke="#f5f1eb" stroke-width="2.2" stroke-linecap="round" />
            <path d="M14.25 7.75H15.75A4.25 4.25 0 0 1 15.75 16.25H14.25" stroke="#f5f1eb" stroke-width="2.2" stroke-linecap="round" />
            <path d="M6.75 12H15.25" stroke="#e8590c" stroke-width="2.2" stroke-linecap="round" />
            <path d="M13.9 8.8L17.4 12L13.9 15.2" stroke="#e8590c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="wordmark">LinkShift</span>
      </div>
      <p class="kicker">App link</p>
      <h1 class="headline">Opening ${appLabel}…</h1>
      <p class="note">
        If nothing happens, the app may not be installed on this device.
        You can try again or continue to the website instead.
      </p>
      <div class="actions">
        <a id="open-app" class="btn btn-primary" href="#" rel="noopener">Open in app</a>
        <a id="open-web" class="btn" href="#" rel="noopener">Continue to website</a>${storeBtn}
      </div>
    </main>
  </div>
  <footer class="foot">
    <a href="https://linkshift.in">linkshift.in</a>
  </footer>
  <script>
    (function () {
      var cfg = ${jsonForScript(cfg)};
      var left = false;
      var timer = null;

      function gotoWeb() { window.location.href = cfg.fallbackUrl; }

      function tryApp() {
        left = false;
        window.location.href = cfg.appUrl;
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
          if (!left && !document.hidden) gotoWeb();
        }, 1800);
      }

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) left = true;
      });
      window.addEventListener("pagehide", function () { left = true; });

      var appBtn = document.getElementById("open-app");
      var webBtn = document.getElementById("open-web");
      var storeBtn = document.getElementById("get-app");
      appBtn.setAttribute("href", cfg.appUrl);
      webBtn.setAttribute("href", cfg.fallbackUrl);
      if (storeBtn && cfg.storeUrl) storeBtn.setAttribute("href", cfg.storeUrl);
      appBtn.addEventListener("click", function (e) {
        e.preventDefault();
        tryApp();
      });
      webBtn.addEventListener("click", function (e) {
        e.preventDefault();
        gotoWeb();
      });

      tryApp();
    })();
  </script>
</body>
</html>`;
};
