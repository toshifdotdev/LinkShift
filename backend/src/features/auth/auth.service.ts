import { prisma } from '../../config';
import * as bcrypt from 'bcrypt';
import { AppError } from '../../errors/AppError';
import { GoogleProfile, RefreshedTokens } from './auth.types';
import { buildAuthResponse } from '../../utils/buildAuthResponse';
import { generateRandomToken, hashToken } from '../../utils/token';
import { sendPasswordResetEmail } from '../../utils/email';
import { issueTokens } from '../../utils/issueToken';

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
                            provider : 'LOCAL',
                        }
                    })

    const {accessToken, refreshToken} = await issueTokens(createdUser);

    return buildAuthResponse(createdUser, accessToken, refreshToken);
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

    const {accessToken, refreshToken} = await issueTokens(existingUser);

    return buildAuthResponse(existingUser, accessToken, refreshToken);
    
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
                avatarUrl,
            }
        });

        const {accessToken, refreshToken} = await issueTokens(updatedUser);

        return buildAuthResponse(updatedUser, accessToken, refreshToken);
    }


    const existingUser = await prisma.user.findUnique({
        where : {
            email
        }
    })

    if(existingUser) {
        const {accessToken, refreshToken} = await issueTokens(existingUser);


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

        return buildAuthResponse(linkedUser, accessToken, refreshToken);
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

    const {accessToken, refreshToken} = await issueTokens(newUser);

    
    return buildAuthResponse(newUser, accessToken, refreshToken);
}


export const forgotPasswordService = async(email : string) => {
    const existingEmail = await prisma.user.findUnique({
        where : {
            email
        }
    })

    if(!existingEmail) {
        return {
            "success": true,
            "message": "If an account exists, we've sent a reset link."
        }
    }

    const generatedToken = generateRandomToken();

    const hashedToken = hashToken(generatedToken);

    await prisma.user.update({
        where : {
            id : existingEmail.id
        },
        data : {
            resetPasswordToken : hashedToken,
            resetPasswordExpires : new Date(Date.now() + 15 * 60 * 1000)
        }
    })

    await sendPasswordResetEmail(email, generatedToken);
    return {
        success: true,
        message: "If an account exists, we've sent a reset link."
    }
    
}

export const resetPasswordService = async(token : string, password : string) => {
    const user = await prisma.user.findFirst({
        where : {
            resetPasswordToken : hashToken(token)
        }
    })

    if(!user) {
        throw new AppError("User Not Found", 400);
    }

    if(user.resetPasswordExpires && user.resetPasswordExpires  < new Date()) {
            throw new AppError("Reset link has expired", 400);
    }
     const hashedPass = await bcrypt.hash(password, 10);
                await prisma.user.update({
                    where : {
                        id : user.id
                    },
                    data : {
                        passwordHash : hashedPass,
                        resetPasswordToken : null,
                        resetPasswordExpires : null
                    }
                })  
}

export const refreshService = async(token : string) : Promise<RefreshedTokens> => {
    const hashedRefreshToken = hashToken(token);

    const user = await prisma.user.findFirst({
        where : {
            refreshTokenHash : hashedRefreshToken
        }
    })

    if (!user) {
        throw new AppError("Unauthorized", 401);
    }

    if(user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
        throw new AppError("Token Expired", 401);
    }

    const { accessToken, refreshToken } = await issueTokens(user);

    return {
        accessToken,
        refreshToken
    }
}


export const logoutService = async(refreshToken : string) => {
    if (!refreshToken) {
        throw new AppError("Unauthorized", 401);
    }
    const hashedRefreshToken = hashToken(refreshToken)
    const user = await prisma.user.findFirst({
        where : {
            refreshTokenHash : hashedRefreshToken,
        }
    })

    if(!user) {
        throw new AppError("Unauthorized", 401);
    }

    await prisma.user.update({
        where : {
            id: user.id
        },
        data : {
            refreshTokenHash : null,
            refreshTokenExpiresAt : null
        }
    })
}

export const profileService = async(id : string) => {
    const user = await prisma.user.findUnique({
        where : {
            id
        },
        select : {
            id : true,
            name : true,
            email : true,
            avatarUrl : true
        }
    })
    if (!user) {
        throw new AppError("User not found", 404);
    }

    return user;
}