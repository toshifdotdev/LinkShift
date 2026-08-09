import { NextFunction, Request, Response } from "express";
import { loginUser, registerUser, forgotPasswordService, resetPasswordService, refreshService, logoutService, profileService, uploadAvatarService, deleteAvatarService} from "./auth.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { forgotPasswordInput, LoginUserInput, RegisterUserInput, resetPasswordInput } from "./auth.validation";
import { setRefreshCookie } from "../../utils/refreshCookie";
import { AuthResponse } from "./auth.types";
import { AppError } from "../../errors/AppError";

export const registerController = asyncHandler(async(req : Request, res : Response) => {
    const validated = req.validated!;
    const body = validated.body as RegisterUserInput;
    const {name, email, password} = body;

    const authResponse = await registerUser(name, email, password);

    setRefreshCookie(res, 
        authResponse.refreshToken
    )

    res.status(201).json({
        message : "User successfully created.",
        user : authResponse.user,
        accessToken : authResponse.accessToken
    })
    
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
//      later when frontend completes 
//     return res.redirect(
//     `${config.frontendUrl}/auth/success?token=${authResponse.token}`
// );

    
    setRefreshCookie(res,
        authResponse.refreshToken
    )
    return res.status(200).json({
        user : authResponse.user,
        accessToken : authResponse.accessToken,
    });

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