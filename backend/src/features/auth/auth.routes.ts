import { Router } from "express";
import { loginController, registerController, googleCallbackController, forgotPasswordController, resetPasswordController, 
         refreshTokenController, logoutController, profileController, uploadAvatarConntroller, deleteAvatarController,
         verifyEmailController,
         resendVerificationController, changePasswordController} from "./auth.controller";
import { validate } from "../../middleware/validate.middleware";
import { forgotPasswordSchema, loginUserSchema, registerUserSchema, resendVerificationSchema, resetPasswordSchema, verifyEmailSchema, changePasswordSchema } from "./auth.validation";
import { forgotPasswordLimiter, loginLimiter, registerLimiter, resendVerificationLimiter, resetPasswordLimiter, changePasswordLimiter } from "../../middleware/rateLimit.middleware";
import passport from "passport";
import { authMiddleWare } from "../../middleware/auth.middleware";
import { config } from "../../config";
import { imageUpload } from "../../middleware/upload.middleware";
import { clearOAuthStateCookie } from "./oauthState";

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
    clearOAuthStateCookie(res);
    res.redirect(`${config.frontendUrl}/login?error=google`);
});

router.post('/forgot-password', validate(forgotPasswordSchema, "body"), forgotPasswordLimiter,forgotPasswordController);
router.post('/reset-password', validate(resetPasswordSchema, "body"), resetPasswordLimiter, resetPasswordController);

router.post('/refresh', refreshTokenController);

router.post('/logout', logoutController);

router.post('/change-password', authMiddleWare, changePasswordLimiter, validate(changePasswordSchema, "body"), changePasswordController);

router.get('/profile', authMiddleWare, profileController);

router.patch('/avatar', authMiddleWare, imageUpload.single("image"), uploadAvatarConntroller);

router.delete('/avatar', authMiddleWare, deleteAvatarController);

router.get('/verify-email', validate(verifyEmailSchema, "query"), verifyEmailController);

router.post('/resend-verification', validate(resendVerificationSchema, "body"), resendVerificationLimiter, resendVerificationController)
export default router;