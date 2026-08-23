import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../errors/AppError";
import { deleteMe, getMe, updateName } from "./users.service";

type AuthedRequest = Request & { auth?: { id: string; email: string } };

function requireAuth(req: AuthedRequest): string {
    if (!req.auth?.id) {
        throw new AppError("Unauthorized", 401);
    }
    return req.auth.id;
}

export const getMeController = asyncHandler(async (req: AuthedRequest, res: Response) => {
    const userId = requireAuth(req);
    const data = await getMe(userId);
    res.status(200).json({ success: true, data });
});

export const updateNameController = asyncHandler(async (req: AuthedRequest, res: Response) => {
    const userId = requireAuth(req);
    const validated = req.validated!;
    const body = validated.body as { name: string };

    const data = await updateName(userId, body.name);
    res.status(200).json({ 
        success: true, 
        data
    });
});

export const deleteMeController = asyncHandler(async (req: AuthedRequest, res: Response) => {
    const userId = requireAuth(req);
    const validated = req.validated!;
    const body = validated.body as { password?: string };

    await deleteMe(userId, body.password);

    // Session cookie is dead with the account.
    res.clearCookie("refreshToken");
    res.status(200).json({
        success: true,
        message: "Account deleted.",
    });
});

