import { Router } from "express";
import { loginController, registerController } from "./auth.controller";
import { validate } from "../../middleware/validate.middleware";
import { loginUserSchema, registerUserSchema } from "./auth.validation";

const router = Router();

router.post('/register', validate(registerUserSchema, "body"), registerController);
router.post('/login', validate(loginUserSchema, "body"),loginController);

export default router;