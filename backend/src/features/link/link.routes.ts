import { Router } from "express";
import { createLink, getLink, getLinks, updateLink, deleteLink } from "./link.controller";
import { createLinkSchema, linkIdSchema, updateLinkSchema } from "./link.validation";
import { authMiddleWare } from "../../middleware/auth.middleware";
import { linkMutationLimiter } from "../../middleware/rateLimit.middleware";
import { validate } from "../../middleware/validate.middleware";
import { querySchema } from "./link.query.validation";


const router = Router();

// /api/v1/links
router.post("/", authMiddleWare, linkMutationLimiter, validate(createLinkSchema, "body"), createLink);

router.get("/", authMiddleWare, validate(querySchema, "query"),getLinks);

router.get("/:id", authMiddleWare,validate(linkIdSchema, "params"), getLink);

router.patch("/:id", authMiddleWare, linkMutationLimiter, validate(linkIdSchema, "params"), validate(updateLinkSchema, "body"), updateLink);

router.delete("/:id", authMiddleWare, linkMutationLimiter, validate(linkIdSchema, "params"), deleteLink);

export default router;

