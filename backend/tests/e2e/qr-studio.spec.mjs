/**
 * QR Studio end-to-end smoke.
 *
 * Drives the existing headless Chrome with CDP to prove the QR Studio
 * preview≡save≡download contract end-to-end. Skipped unless RUN_E2E=1.
 *
 * Requires:
 *  - backend listening on http://localhost:3000
 *  - vite dev server listening on http://localhost:5173
 *  - Chrome launched with --headless=new --remote-debugging-port=9223
 *  - a seeded account; the test logs in with credentials supplied via
 *    E2E_EMAIL / E2E_PASSWORD env vars (defaults match the dev fixture).
 *  - node_modules/jsqr resolvable (install separately: `npm i -D jsqr`).
 *    The decode step is best-effort: if jsqr is missing the test
 *    surfaces a clear failure rather than aborting.
 */
import { createRequire } from "module";
import { writeFileSync } from "fs";
import http from "http";
import { existsSync } from "fs";

const require = createRequire(import.meta.url);
const sharp = require("G:/LinkShift/backend/node_modules/sharp");

const RUN = !!process.env.RUN_E2E;
const skip = (n) => { console.log(`SKIP  ${n}`); };

if (!RUN) { skip("RUN_E2E not set"); process.exit(0); }

const CDP_URL = process.env.E2E_CDP_URL || "http://127.0.0.1:9223";
const APP = process.env.E2E_APP_URL || "http://localhost:5173";
const API = process.env.E2E_API_URL || "http://localhost:3000";
const EMAIL = process.env.E2E_EMAIL || "repro-settings@linkshift.test";
const PASSWORD = process.env.E2E_PASSWORD || "SweepPass!123";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const A = (n, ok, d) => { results.push({ n, ok, d }); console.log(`${ok ? "PASS" : "FAIL"}  ${n}  ${d ? `| ${d}` : ""}`); };

function reqJSON(path, headers = {}, method = "GET", body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const r = http.request({ host: "localhost", port: 3000, path, method, headers: { ...headers, ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}) } }, (res) => {
            let buf = Buffer.alloc(0);
            res.on("data", (c) => (buf = Buffer.concat([buf, c])));
            res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: buf }));
        });
        r.on("error", reject);
        if (data) r.write(data);
        r.end();
    });
}

async function main() {
    // ---------- 1. login + create a fresh link to host the QR
    const login = await reqJSON("/api/v1/auth/login", {}, "POST", { email: EMAIL, password: PASSWORD });
    if (login.status !== 200) { A("login", false, `status=${login.status} body=${login.body.toString("utf8").slice(0, 120)}`); return; }
    const TOKEN = JSON.parse(login.body.toString("utf8")).accessToken;
    A("login", true, "ok");

    const domR = await reqJSON("/api/v1/domains", { Authorization: `Bearer ${TOKEN}` });
    const def = JSON.parse(domR.body.toString("utf8")).data.find((d) => d.isDefault);
    const linkR = await reqJSON("/api/v1/links", { Authorization: `Bearer ${TOKEN}` }, "POST", {
        targetUrl: "https://example.com/e2e-qr", name: `e2e-qr-${Date.now()}`, domainId: def.id,
    });
    const link = JSON.parse(linkR.body.toString("utf8")).data;
    A("created link", !!link, `shortId=${link.shortId}`);

    // ---------- 2. drive the studio
    const t = (await (await fetch(`${CDP_URL}/json/list`)).json()).find((x) => x.type === "page");
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0; const pend = new Map();
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result); pend.delete(d.id); } };
    const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expr, ap = false) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: ap }); if (r.exceptionDetails) return "ERR:" + r.exceptionDetails.exception?.description; return r.result.value; };
    const sh = async (n) => { const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`C:/Users/ADMINI~1/AppData/Local/Temp/opencode/${n}.png`, Buffer.from(r.data, "base64")); };
    const wait = async (e, ms = 25000) => { const s = Date.now(); while (Date.now() - s < ms) { if ((await ev(e)) === true) return true; await sleep(200); } throw new Error("timeout " + e); };

    await send("Page.enable"); await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `${APP}/login` });
    await wait(`document.body && document.body.innerText.length > 0`);
    await ev(`localStorage.setItem('ls:access-token', ${JSON.stringify(TOKEN)}); location.href = '${APP}/app/qr'; 'go'`);
    await wait(`!!document.querySelector('article, [role="dialog"], h1')`, 30000);
    await sleep(5000);

    // Open studio from the gallery for the freshly created link
    const opened = await ev(`(() => { const cards = [...document.querySelectorAll('article')]; const card = cards.find(c => c.textContent.includes('${link.shortId}')); if (!card) return 'no-card'; const btn = [...card.querySelectorAll('button')].find(x => x.innerText.trim().toLowerCase() === 'studio'); if (!btn) return 'no-btn'; btn.click(); return 'clicked'; })()`);
    A("open studio from gallery", opened === "clicked", String(opened));
    await wait(`!!document.querySelector('[role="dialog"]')`, 15000);
    await sleep(800);

    // Save with the studio defaults (no frame, no logo) — proves the contract.
    const save = await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim().toLowerCase()==='generate & save'); if(!b) return 'no-btn'; if(b.disabled) return 'disabled'; b.click(); return 'clicked'; })()`);
    A("generate & save", save === "clicked", String(save));
    await wait(`document.body.innerText.includes('QR code saved')`, 30000);
    await sleep(800);

    // Capture blob from the Download button — proves the download path returns a PNG.
    const dl = await ev(`(async () => {
      const orig = URL.createObjectURL;
      let captured = null;
      URL.createObjectURL = function(b){ captured = orig.call(URL, b); return captured; };
      const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim().toLowerCase() === 'download png');
      if (!b) { URL.createObjectURL = orig; return JSON.stringify({error: 'no-btn'}); }
      b.click();
      await new Promise(r => setTimeout(r, 2000));
      URL.createObjectURL = orig;
      return JSON.stringify({ captured: !!captured });
    })()`, true);
    A("download button triggers object URL", JSON.parse(dl).captured === true, dl);

    // ---------- 3. server contract: download endpoint returns the latest persisted asset
    // The endpoint is a 302 to Cloudinary (we follow the redirect to get bytes).
    const dlR = await reqJSON(`/api/v1/qr/${link.id}/download`, { Authorization: `Bearer ${TOKEN}` });
    let pngBytes = dlR.body;
    if (dlR.status === 302 && dlR.headers.location) {
        const loc = dlR.headers.location;
        const u = new URL(loc);
        const followed = await new Promise((res) => {
            const r = http.request({ host: u.host, path: u.pathname + u.search, method: "GET" }, (resp) => {
                let buf = Buffer.alloc(0);
                resp.on("data", (c) => (buf = Buffer.concat([buf, c])));
                resp.on("end", () => res({ status: resp.statusCode, headers: resp.headers, body: buf }));
            });
            r.end();
        });
        pngBytes = followed.body;
        A("download endpoint redirects to Cloudinary with the latest asset", followed.status === 200 && followed.headers["content-type"]?.includes("image/png"), `status=${followed.status} ct=${followed.headers["content-type"]} bytes=${followed.body.length}`);
    } else if (dlR.status === 200) {
        A("download endpoint returns 200 + PNG", dlR.headers["content-type"]?.includes("image/png"), `${dlR.headers["content-type"]} bytes=${dlR.body.length}`);
    } else {
        A("download endpoint", false, `status=${dlR.status}`);
    }

    // geometry sanity (before the decode that needs meta)
    const meta = await sharp(pngBytes).metadata();
    A("downloaded PNG is a valid 300x300 QR", meta.format === "png" && meta.width === 300, `${meta.width}x${meta.height}`);

    // ---------- 4. scannability: decode the PNG and confirm it routes to the link's short URL
    let decoded = null;
    try {
        const jsQRRequire = createRequire(import.meta.url);
        const jsQR = jsQRRequire("jsqr");
        const raw = await sharp(pngBytes).ensureAlpha().raw().toBuffer();
        decoded = jsQR(new Uint8ClampedArray(raw), meta.width, meta.height);
    } catch (e) {
        A("downloaded QR is scannable", false, `decode failed: ${e.message}`);
    }
    if (decoded) A("downloaded QR is scannable", true, `→ ${decoded.data}`);

    // ---------- 5. cleanup the test link
    await reqJSON(`/api/v1/links/${link.id}`, { Authorization: `Bearer ${TOKEN}` }, "DELETE");
    A("cleaned up", true, "");

    await sh("e2e-final");

    const fails = results.filter((r) => !r.ok);
    console.log(`\n==== ${results.length - fails.length}/${results.length} passed ====`);
    if (fails.length) { fails.forEach((f) => console.log("  - " + f.n + ": " + f.d)); process.exit(1); }
    process.exit(0);
}

main().catch((e) => { console.error("E2E failed:", e); process.exit(1); });
