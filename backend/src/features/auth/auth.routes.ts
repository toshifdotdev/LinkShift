import { Router } from "express";
import { loginController, registerController, googleCallbackController, forgotPasswordController, resetPasswordController, refreshTokenController, logoutController, profileController} from "./auth.controller";
import { validate } from "../../middleware/validate.middleware";
import { forgotPasswordSchema, loginUserSchema, registerUserSchema, resetPasswordSchema } from "./auth.validation";
import { forgotPasswordLimiter, loginLimiter, registerLimiter, resetPasswordLimiter } from "../../middleware/rateLimit.middleware";
import passport from "passport";
import { authMiddleWare } from "../../middleware/auth.middleware";

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

router.post('/forgot-password', validate(forgotPasswordSchema, "body"), forgotPasswordLimiter,forgotPasswordController);
router.post('/reset-password', validate(resetPasswordSchema, "body"), resetPasswordLimiter, resetPasswordController);

router.post('/refresh', refreshTokenController);

router.post('/logout', logoutController);

router.get('/profile', authMiddleWare, profileController);
export default router;