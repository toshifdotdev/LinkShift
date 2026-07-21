import { Request, Response } from "express";
import { registerUser } from "./auth.service";
import { asyncHandler } from "../../utils/asyncHandler";

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