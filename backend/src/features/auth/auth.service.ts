import { prisma, config } from '../../config';
import * as bcrypt from 'bcrypt';
import { AppError } from '../../errors/AppError';
import { GoogleProfile } from './auth.types';
import { buildAuthResponse } from '../../utils/buildAuthResponse';

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
                            passwordHash : hashPassword,
                            provider : 'LOCAL'
                        }
                    })

    return buildAuthResponse(createdUser);
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

    if(!existingUser.passwordHash) {
        throw new AppError("Please login with Google.", 400);
    }



    const comparePass = await bcrypt.compare(password, existingUser.passwordHash);

    if(!comparePass) {
        throw new AppError("Incorrect credentials", 401);
    }

    return buildAuthResponse(existingUser);
    
}


export const googleLogin = async(profile : GoogleProfile) => {
    const googleId = profile.id;
    
    const email = profile.emails?.[0]?.value;
    if (!email) {
        throw new AppError("Google account has no email.", 400);
    }
    const name = profile.displayName ?? "Google User";
    const avatarUrl = profile.photos?.[0]?.value  ?? null;

    

    const existingGoogleUser = await prisma.user.findUnique({
        where: {
            googleId
        }
    })

    if(existingGoogleUser) {

        const updatedUser = await prisma.user.update({
            where: {
                googleId
            },
            data: {
                avatarUrl
            }
        });
        return buildAuthResponse(updatedUser);
    }

    const existingUser = await prisma.user.findUnique({
        where : {
            email
        }
    })

    if(existingUser) {
        const linkedUser = await prisma.user.update({
            where : {
                email : existingUser.email
            },
            data : {
                googleId,
                avatarUrl,
                provider : 'GOOGLE',
            }
        })

        return buildAuthResponse(linkedUser);
    }

    const newUser = await prisma.user.create({
        data : {
            googleId,
            email,
            name,
            avatarUrl,
            provider : 'GOOGLE'
        }
    })

    return buildAuthResponse(newUser);
}