import { Router } from "express";
import { authMiddleWare } from "../../middleware/auth.middleware";
import { linkMutationLimiter } from "../../middleware/rateLimit.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
    createTag,
    deleteTag,
    listTags,
    renameTag,
} from "./tag.controller";
import { createTagSchema, renameTagSchema } from "./tag.service";
import { tagIdSchema } from "./tag.validation";

const router = Router();

router.get("/", authMiddleWare, listTags);

router.post(
    "/",
    authMiddleWare,
    linkMutationLimiter,
    validate(createTagSchema, "body"),
    createTag
);

router.patch(
    "/:id",
    authMiddleWare,
    linkMutationLimiter,
    validate(tagIdSchema, "params"),
    validate(renameTagSchema, "body"),
    renameTag
);

router.delete(
    "/:id",
    authMiddleWare,
    linkMutationLimiter,
    validate(tagIdSchema, "params"),
    deleteTag
);

export default router;