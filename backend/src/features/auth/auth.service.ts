import { prisma, config } from '../../config';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../../errors/AppError';

export const registerUser = async (name : string, email : string, password : string) => {
    const existingUser = await prisma.user.findUnique({
        where : {
            email
        }
    })
    if(existingUser !== null) {
        throw new AppError("Conflict",409);
    }
    const hashPassword = await bcrypt.hash(password , 10); // saltRounds = 10
    const createdUser = await prisma.user.create({
                        data : {
                            name,
                            email,
                            password : hashPassword
                        }
                    })
    const token = jwt.sign({
                    id : createdUser.id, 
                    email : createdUser.email}, 
                    config.jwtSecret!, {
                        expiresIn : '2h'
                    })
    return {
        user : {
            id : createdUser.id,
            name : createdUser.name,
            email : createdUser.email,
            createdAt :createdUser.createdAt
            },
        token
    }
}   


export const loginUser = async (email : string, password : string) => {
    const existingUser = await prisma.user.findUnique({
        where : {
            email
        }
    })

    if(!existingUser) {
        throw new AppError("Email not exists", 404);
    }

    const comparePass = await bcrypt.compare(password, existingUser.password);

    if(!comparePass) {
        throw new AppError("Incorrect credentials", 401);
    }

    const token = jwt.sign({
                    id : existingUser.id, 
                    email : existingUser.email }, 
                    config.jwtSecret!, {
                        expiresIn : '2h'
                    })
    return ({
        user : {
            id : existingUser.id,
            name : existingUser.name,
            email : existingUser.email,
            },
        token
    })
    
}