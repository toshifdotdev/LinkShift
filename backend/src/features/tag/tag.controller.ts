import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../errors/AppError";
import {
    createTagSchema,
    renameTagSchema,
    CreateTagData,
} from "./tag.service";
import {
    createTag as createTagSvc,
    deleteTag as deleteTagSvc,
    listTags as listTagsSvc,
    renameTag as renameTagSvc,
} from "./tag.service";

type TagParams = { id: string };

export const listTags = asyncHandler(async (req: Request, res: Response) => {
    const auth = req.auth;

    if (!auth) {
        throw new AppError("Unauthorized", 401);
    }

    const tags = await listTagsSvc(auth.id);

    res.status(200).json({
        success: true,
        data: tags.map((t) => ({
            id: t.id,
            name: t.name,
            linkCount: t._count.links,
        })),
    });
});

export const createTag = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const auth = req.auth;

        if (!auth) {
            return next(new AppError("Unauthorized", 401));
        }

        const validated = req.validated!;
        const { name } = validated.body as CreateTagData;

        const tag = await createTagSvc(auth.id, name);

        res.status(201).json({
            success: true,
            data: { id: tag.id, name: tag.name, linkCount: 0 },
        });
    }
);

export const renameTag = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const auth = req.auth;

        if (!auth) {
            return next(new AppError("Unauthorized", 401));
        }

        const validated = req.validated!;
        const { id } = validated.params as TagParams;
        const { name } = validated.body as CreateTagData;

        const tag = await renameTagSvc(auth.id, id, name);

        res.status(200).json({ success: true, data: tag });
    }
);

export const deleteTag = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const auth = req.auth;

        if (!auth) {
            return next(new AppError("Unauthorized", 401));
        }

        const validated = req.validated!;
        const { id } = validated.params as TagParams;

        await deleteTagSvc(auth.id, id);

        res.status(200).json({ success: true });
    }
);

