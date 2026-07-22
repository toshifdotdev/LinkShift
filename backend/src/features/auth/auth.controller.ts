import { Request, Response } from "express";
import { loginUser, registerUser } from "./auth.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config";

export const registerController = asyncHandler(async(req : Request, res : Response) => {
    const {name, email, password} = req.body;


    // ------- Zod Validation ------------------
    // if(!email || !password || !name) {       
    //     res.status(400).json({
    //         error : "Missing required field"
    //     })
    //     return;
    // }
    //------------------------------------------

    const { user, token } = await registerUser(name, email, password);
    res.status(201).json({
        message : "User successfully created.",
        user,
        token
    })
    
})



export const loginController = asyncHandler(async(req : Request, res : Response) => {
    const { email, password } = req.body;

    const { user, token } = await loginUser(email,password);
    res.status(200).json({
        message : "Logged in successfully.",
        user,
        token
    })
    
})