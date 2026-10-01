import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { readStatus } from "./status.service";

export const getStatusController = asyncHandler(
    async (_req: Request, res: Response) => {
        const payload = await readStatus();

        res.set("Cache-Control", "no-store");
        res
            .status(payload.status === "down" ? 503 : 200)
            .json(payload);
    }
);