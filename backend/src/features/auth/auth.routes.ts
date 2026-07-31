import { Router } from "express";
import { loginController, registerController } from "./auth.controller";
import { validate } from "../../middleware/validate.middleware";
import { loginUserSchema, registerUserSchema } from "./auth.validation";
import { loginLimiter, registerLimiter } from "../../middleware/rateLimit.middleware";

const router = Router();

router.post('/register', validate(registerUserSchema, "body"), registerLimiter, registerController);
router.post('/login', validate(loginUserSchema, "body"), loginLimiter, loginController);

export default router;