import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { log } from "../utils/logger";
import { config } from "../config";
import { clearOAuthStateCookie } from "../features/auth/oauthState";


function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function copyFor(statusCode: number, message: string): { kicker: string; headline: string; note: string; ctaHref: string; ctaLabel: string } {
    if (statusCode === 404) {
        return {
            kicker: "404",
            headline: "This short link doesn't exist.",
            note: "The link may have been removed, or the address typed in doesn't match anything on LinkShift.",
            ctaHref: "/register",
            ctaLabel: "Make your own",
        };
    }
    if (statusCode === 410) {
        return {
            kicker: "410",
            headline: "This short link has expired.",
            note: "It stopped resolving on the date the owner set. Ask them for an updated link.",
            ctaHref: "/",
            ctaLabel: "Try again later",
        };
    }
    if (statusCode === 403) {
        return {
            kicker: "403",
            headline: "This short link is unavailable.",
            note: message || "The link has been paused by its owner, or the destination is not currently reachable.",
            ctaHref: "/",
            ctaLabel: "Back to home",
        };
    }
    if (statusCode === 429) {
        return {
            kicker: "429",
            headline: "You're going a bit fast.",
            note: message || "This page has had a lot of traffic from your network just now. Give it a moment, then try again.",
            ctaHref: "/",
            ctaLabel: "Back to home",
        };
    }
    return {
        kicker: String(statusCode),
        headline: "Something went wrong.",
        note: message || "The link is temporarily unavailable. Please try again in a moment.",
        ctaHref: "/",
        ctaLabel: "Back to home",
    };
}

export function renderPublicError(statusCode: number, message: string): string {
    const safe = escapeHtml(message || "");
    const { kicker, headline, note, ctaHref, ctaLabel } = copyFor(statusCode, safe);
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="dark" />
<meta name="robots" content="noindex,nofollow" />
<title>LinkShift — ${kicker}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #0d0d0d; color: #f5f1eb; min-height: 100vh; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
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
    margin: 0 0 12px;
    display: flex; align-items: center; gap: 12px;
  }
  .kicker::before {
    content: ""; height: 1px; width: 20px; background: rgba(232, 89, 12, 0.4);
  }
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
      <p class="kicker">${kicker}</p>
      <h1 class="headline">${headline}</h1>
      <p class="note">${note}</p>
      <div class="actions">
        <a class="btn btn-primary" href="${ctaHref}">${ctaLabel}</a>
      </div>
    </main>
  </div>
  <footer class="foot">
    <a href="https://linkshift.in">linkshift.in</a>
  </footer>
</body>
</html>`;
}


const prefersJson = (req: Request): boolean => {
    const accept = req.headers.accept ?? "";
    return accept.includes("application/json") && !accept.includes("text/html");
};


export const createVisitorRateLimitHandler =
    (message: { success: boolean; message: string }) =>
    (req: Request, res: Response): void => {
        res.status(429);
        if (prefersJson(req)) {
            res.json(message);
            return;
        }
        res.set("Cache-Control", "no-store")
            .type("html")
            .send(renderPublicError(429, message.message));
    };

export const errorMiddleware = (err : unknown, req : Request, res : Response, next : NextFunction) => {
    
    
    
    
    if (req.path === "/api/v1/auth/google" || req.path === "/api/v1/auth/google/callback") {
        log.error("google_auth_failed", {
            path: req.originalUrl,
            errName: (err as Error)?.name,
            errMessage: (err as Error)?.message,
        });
        clearOAuthStateCookie(res);
        return res.redirect(`${config.frontendUrl}/login?error=google`);
    }

    if(req.path.startsWith('/api')) {

            if (err instanceof AppError) {
                return res.status(err.statusCode).json({
                    success: false,
                    message: err.message
                });
            }
            
            
            log.error("http_500", {
                method: req.method,
                path: req.originalUrl,
                errName: (err as Error)?.name,
                errMessage: (err as Error)?.message,
                errStack: (err as Error)?.stack,
            });
            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
    }

        if(err instanceof AppError) {
            
            
            if (err.statusCode === 429 && prefersJson(req)) {
                return res.status(429).json({ success: false, message: err.message });
            }
            return res.status(err.statusCode).send(renderPublicError(err.statusCode, err.message));
        }
        else {
           return res.status(500).send(renderPublicError(500, "Internal Server Error"));

        }
    }