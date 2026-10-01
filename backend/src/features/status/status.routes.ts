import { Router } from "express";
import { getStatusController } from "./status.controller";

const router = Router();

router.get("/", getStatusController);

export default router;