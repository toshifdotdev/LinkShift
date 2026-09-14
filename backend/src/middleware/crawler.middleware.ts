import { NextFunction, Request, Response } from "express";

export const REDIRECT_HOST = "go.linkshift.in";

const MARKETING_HOST = "linkshift.in";

export const NOINDEX_HEADER = "noindex, nofollow";

export const REDIRECT_ROBOTS_TXT = "User-agent: *\nDisallow: /\n";


export const normalizeHost = (host: string | undefined): string =>
    (host ?? "").toLowerCase().replace(/:\d+$/, "");

export const isRedirectHost = (host: string | undefined): boolean => {
    const normalized = normalizeHost(host);

    if (!normalized) return false;
    if (normalized === MARKETING_HOST || normalized === `www.${MARKETING_HOST}`) {
        return false;
    }

    return true;
};

export const redirectHostRobots = (req: Request, res: Response, next: NextFunction): void => {
    if (!isRedirectHost(req.headers.host)) {
        next();
        return;
    }

    res.status(200).type("text/plain").set("Cache-Control", "public, max-age=3600").send(REDIRECT_ROBOTS_TXT);
};

export const redirectHostNoIndex = (req: Request, res: Response, next: NextFunction): void => {
    if (isRedirectHost(req.headers.host)) {
        res.set("X-Robots-Tag", NOINDEX_HEADER);
    }

    next();
};
