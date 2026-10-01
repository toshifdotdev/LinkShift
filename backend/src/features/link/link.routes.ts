import { Router } from "express";
import { createLink, getLink, getLinks, updateLink, deleteLink, importLinks } from "./link.controller";
import { createLinkSchema, linkIdSchema, updateLinkSchema } from "./link.validation";
import { authMiddleWare } from "../../middleware/auth.middleware";
import { linkMutationLimiter, linkImportLimiter } from "../../middleware/rateLimit.middleware";
import { validate } from "../../middleware/validate.middleware";
import { querySchema } from "./link.query.validation";
import { linkImportSchema } from "./link.import.validation";


const router = Router();


router.post("/", authMiddleWare, linkMutationLimiter, validate(createLinkSchema, "body"), createLink);

router.get("/", authMiddleWare, validate(querySchema, "query"),getLinks);

// Bulk import. Registered before `/:id` so the literal path is not swallowed
// by the id route. Validate at the route for the envelope; each row is
// re-validated individually in the service so one bad row does not fail the
// whole request.
router.post("/import", authMiddleWare, linkImportLimiter, validate(linkImportSchema, "body"), importLinks);

router.get("/:id", authMiddleWare,validate(linkIdSchema, "params"), getLink);

router.patch("/:id", authMiddleWare, linkMutationLimiter, validate(linkIdSchema, "params"), validate(updateLinkSchema, "body"), updateLink);

router.delete("/:id", authMiddleWare, linkMutationLimiter, validate(linkIdSchema, "params"), deleteLink);

export default router;

