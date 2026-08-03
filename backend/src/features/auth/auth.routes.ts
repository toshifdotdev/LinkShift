import { Router } from "express";
import { loginController, registerController, googleCallbackController} from "./auth.controller";
import { validate } from "../../middleware/validate.middleware";
import { loginUserSchema, registerUserSchema } from "./auth.validation";
import { loginLimiter, registerLimiter } from "../../middleware/rateLimit.middleware";
import passport from "passport";

const router = Router();

router.post('/register', validate(registerUserSchema, "body"), registerLimiter, registerController);
router.post('/login', validate(loginUserSchema, "body"), loginLimiter, loginController);

router.get('/google', passport.authenticate("google", { scope : ["profile", "email"], session : false}))  ;
router.get('/google/callback', passport.authenticate("google", {
                                                                session : false,
                                                                failureRedirect : "/api/v1/auth/google/failure"
                                                            }),
                                                            googleCallbackController)

router.get("/google/failure", (_, res) => {
    res.status(401).json({
        success: false,
        message: "Google authentication failed."
    });
});
export default router;