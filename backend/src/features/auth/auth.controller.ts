import { Request, Response } from "express";
import { loginUser, registerUser, forgotPasswordService, resetPasswordService } from "./auth.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { forgotPasswordInput, LoginUserInput, RegisterUserInput, resetPasswordInput } from "./auth.validation";

export const registerController = asyncHandler(async(req : Request, res : Response) => {
    const validated = req.validated!;
    const body = validated.body as RegisterUserInput;
    const {name, email, password} = body;

    const { user, token } = await registerUser(name, email, password);
    res.status(201).json({
        message : "User successfully created.",
        user,
        token
    })
    
})


export const loginController = asyncHandler(async(req : Request, res : Response) => {
    const validated = req.validated!;
    const body = validated.body as LoginUserInput;
    const { email, password } = body;

    const { user, token } = await loginUser(email,password);
    res.status(200).json({
        message : "Logged in successfully.",
        user,
        token
    })
    
})


export const googleCallbackController = (req : Request, res : Response) => {
    const authResponse = req.user;

//     return res.redirect(
//     `${config.frontendUrl}/auth/success?token=${authResponse.token}`
// );

    return res.status(200).json(authResponse);

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