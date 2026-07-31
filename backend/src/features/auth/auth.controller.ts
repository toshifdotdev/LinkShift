import { Request, Response } from "express";
import { loginUser, registerUser } from "./auth.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config";
import { LoginUserInput, RegisterUserInput } from "./auth.validation";

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