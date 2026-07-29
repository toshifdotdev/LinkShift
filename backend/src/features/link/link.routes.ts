import { Router } from "express";
import { createLink, getLink, getLinks, updateLink, deleteLink } from "./link.controller";
import { createLinkSchema, linkIdSchema, updateLinkSchema } from "./link.validation";
import { authMiddleWare } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { querySchema } from "./link.query.validation";


const router = Router();

// /api/v1/links
router.post("/", authMiddleWare, validate(createLinkSchema, "body"), createLink);

router.get("/", authMiddleWare, validate(querySchema, "query"),getLinks);

router.get("/:id", authMiddleWare,validate(linkIdSchema, "params"), getLink);

router.patch("/:id", authMiddleWare, validate(linkIdSchema, "params"), validate(updateLinkSchema, "body"), updateLink);

router.delete("/:id", authMiddleWare, validate(linkIdSchema, "params"), deleteLink);

export default router;

