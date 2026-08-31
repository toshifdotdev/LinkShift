import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { redirect as redirectService, unlockService } from "./redirect.service";
import { unlockData } from "./redirect.validation";
import { getHost } from "../../utils/getHost";

type RedirectParams = {
    shortId : string;
};


export const redirect = asyncHandler(async(req : Request, res : Response) => {
    const validated = req.validated!;
    const params = validated.params as RedirectParams;
    const { shortId } = params;

    const host = getHost(req.headers.host ?? "");

    const result = await redirectService(shortId, host, req);

    if(result.requiresPassword) {
        res.status(401).json(result);
        return;
    }

    if (result.kind === "interstitial") {
        res.status(200)
            .set("Cache-Control", "no-store")
            .type("html")
            .send(result.html);
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

    const targetUrl = await unlockService(shortId, password, host, req);

    return res.redirect(targetUrl!);
})