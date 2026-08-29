import { Router } from "express";
import { z } from "zod";
import { authMiddleWare } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { deleteMeController, getMeController, updateNameController,} from "./users.controller";
import { deleteAccountLimiter } from "../../middleware/rateLimit.middleware";

const router = Router();

router.get("/me", authMiddleWare, getMeController);

const updateNameSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters long.")
        .max(50, "Name cannot exceed 50 characters."),
});

router.patch(
    "/me",
    authMiddleWare,
    validate(updateNameSchema, "body"),
    updateNameController
);

const deleteAccountSchema = z.object({
    password: z.string().min(1).optional(),
    confirmation: z
        .string()
        .trim()
        .min(1, "Type your account email to confirm deletion."),
});

router.delete(
    "/me",
    authMiddleWare,
    deleteAccountLimiter,
    validate(deleteAccountSchema, "body"),
    deleteMeController
);

export default router;
