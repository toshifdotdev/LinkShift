import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { redirect as redirectService, unlockService } from "./redirect.service";
import { unlockData } from "./redirect.validation";
import { getHost } from "../../utils/getHost";
import { extractQuery, extractRest } from "../../utils/appDeepLink";
import { renderUnlockPage } from "../../utils/unlockPage";

type RedirectParams = {
    shortId : string;
};


const prefersJson = (req: Request): boolean => {
    const accept = req.headers.accept ?? "";
    return accept.includes("application/json") && !accept.includes("text/html");
};

const sendInterstitial = (res: Response, html: string): void => {
    res.status(200)
        .set("Cache-Control", "no-store")
        .type("html")
        .send(html);
};

export const redirect = asyncHandler(async(req : Request, res : Response) => {
    const validated = req.validated!;
    const params = validated.params as RedirectParams;
    const { shortId } = params;

    const host = getHost(req.headers.host ?? "");

    const result = await redirectService(shortId, host, req);

    if(result.requiresPassword) {
        if (prefersJson(req)) {
            res.status(401).json(result);
            return;
        }
        
        const rest = extractRest(req.params as Record<string, unknown>);
        const query = extractQuery(req.url ?? "");
        res.status(401)
            .set("Cache-Control", "no-store")
            .type("html")
            .send(renderUnlockPage({ shortId, rest, query }));
        return;
    }

    if (result.kind === "interstitial") {
        sendInterstitial(res, result.html);
        return;
    }

    res.redirect(result.targetUrl);
})

export const unlockController = asyncHandler(async(req : Request, res : Response) => {
    const validated = req.validated!;
    const body = validated.body as unlockData;
    const params = req.params as RedirectParams;
    const { shortId } = params;

    const { password } = body;

    const host = getHost(req.headers.host ?? "");

    const resolved = await unlockService(shortId, password, host, req);

    if (resolved.kind === "interstitial") {
        sendInterstitial(res, resolved.html);
        return;
    }

    return res.redirect(resolved.targetUrl);
})
