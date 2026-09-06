import { NextFunction, Request, Response } from "express";
import { loginUser, registerUser, forgotPasswordService, resetPasswordService, refreshService, logoutService, profileService, uploadAvatarService, deleteAvatarService, verifyEmailService, resendVerificationService, changePasswordService} from "./auth.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { forgotPasswordInput, LoginUserInput, RegisterUserInput, resendVerificationInput, resetPasswordInput, verifyEmailInput } from "./auth.validation";
import { setRefreshCookie } from "../../utils/refreshCookie";
import { clearOAuthStateCookie } from "./oauthState";
import { AuthResponse } from "./auth.types";
import { AppError } from "../../errors/AppError";
import { config } from "../../config";

export const registerController = asyncHandler(async(req : Request, res : Response) => {
    const validated = req.validated!;
    const body = validated.body as RegisterUserInput;
    const {name, email, password} = body;

    const result = await registerUser(name, email, password);


    res.status(201).json({
        success: true,
        ...result
    });
    
})


export const loginController = asyncHandler(async(req : Request, res : Response) => {
    const validated = req.validated!;
    const body = validated.body as LoginUserInput;
    const { email, password } = body;
    

    const authResponse = await loginUser(email,password);

    setRefreshCookie(res,
        authResponse.refreshToken
    )
    res.status(200).json({
        message : "Logged in successfully.",
        user : authResponse.user,
        accessToken : authResponse.accessToken
    })
    
})


export const googleCallbackController = (req : Request, res : Response) => {
    const authResponse = req.user as AuthResponse;

    
    
    
    
    
    
    setRefreshCookie(res,
        authResponse.refreshToken
    )
    return res.redirect(
        `${config.frontendUrl}/auth/google/callback#accessToken=${encodeURIComponent(authResponse.accessToken)}`
    );

}

export const forgotPasswordController =  asyncHandler(async(req : Request, res : Response)=> {
    const validated = req.validated!;

    const body = validated.body as forgotPasswordInput;
    const { email } = body;

    const result = await forgotPasswordService(email);

    res.status(200).json(result);
});

export const resetPasswordController = asyncHandler(async(req : Request, res : Response) => {
    const validated = req.validated!

    const body = validated.body as resetPasswordInput;

    const {token, password} = body;

    await resetPasswordService(token, password);

    res.status(200).json({
        success : true,
        message : "Password successfully reset."
    })

})


export const refreshTokenController = asyncHandler(async(req : Request, res : Response) => {
    const { refreshToken } = req.cookies;

    const tokens = await refreshService(refreshToken);

    setRefreshCookie(res, 
        tokens.refreshToken
    )

    res.status(200).json({
        accessToken : tokens.accessToken,
    });

})

export const changePasswordController = asyncHandler(async(req : Request, res : Response) => {
    const auth = req.auth;

    if (!auth) {
        throw new AppError("Unauthorized", 401);
    }

    const body = req.validated!.body as { currentPassword?: string; newPassword: string };

    await changePasswordService(auth.id, body.currentPassword, body.newPassword);

    
    res.clearCookie("refreshToken");

    res.status(200).json({
        success: true,
        message: "Password updated. Please sign in again.",
    });

})


export const logoutController = asyncHandler(async(req : Request, res : Response) => {
    
    const { refreshToken } = req.cookies;

    await logoutService(refreshToken);

    res.clearCookie("refreshToken");

    res.status(200).json({ 
        success : true,
        message : "Logged out successfully"
    })

})


export const profileController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;

    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const userDetails = await profileService(auth.id);

    res.status(200).json({ 
        success : true,
        data : userDetails
    })

})


export const uploadAvatarConntroller = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;

    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    if (!req.file) {
        throw new AppError("Image is required.", 400);
    }

    const avatarUrl = await uploadAvatarService(auth.id, req.file);

    res.status(200).json({ 
        success : true,
        avatarUrl
    })
})

export const deleteAvatarController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;

    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    await deleteAvatarService(auth.id);

    res.status(200).json({
        success : true,
        message : "Avatar removed successfully"
    })
})

export const verifyEmailController =  asyncHandler(async(req : Request, res : Response, next : NextFunction) => {

    const validated = req.validated!;
    
    const { token } = validated.query as verifyEmailInput;

    try {
        await verifyEmailService(token);
        return res.redirect(
            `${config.frontendUrl}/login?verified=true`
        );
    } catch (err) {
        return res.redirect(
            `${config.frontendUrl}/verify-email?error=expired`
        );
    }
})


export const resendVerificationController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const validated = req.validated!;

    const body = validated.body as resendVerificationInput;
    const { email } = body;

    await resendVerificationService(email);

    res.status(200).json({
        success: true,
        message: "If an account exists, a verification email has been sent."
    });
})