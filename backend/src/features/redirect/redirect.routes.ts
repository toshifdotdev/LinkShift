import { Router } from "express";
import { authMiddleWare } from "../../middleware/auth.middleware";

const router = Router();

// router.post("/create", authMiddleWare, createLinkController);

export default router;