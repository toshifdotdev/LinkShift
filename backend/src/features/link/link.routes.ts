import { Router } from "express";
import { createLink } from "./link.controller";
import { createLinkSchema } from "./link.validation";
import { authMiddleWare } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";


const router = Router();


router.post("/", authMiddleWare, validate(createLinkSchema, "body"), createLink);

router.get("/", authMiddleWare, getLinks);

router.get("/:id", authMiddleWare,validate(linkIdSchema, "params"), getLink);

router.patch("/:id", authMiddleWare, validate(linkIdSchema, "params"), validate(updateLinkSchema, "body"), updateLink);

router.delete("/:id", authMiddleWare, validate(linkIdSchema, "params"), deleteLink);

export default router;

