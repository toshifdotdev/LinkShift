import { prisma } from '../../config';
import * as bcrypt from 'bcrypt';
import { AppError } from '../../errors/AppError';
import { GoogleProfile, RefreshedTokens } from './auth.types';
import { buildAuthResponse } from '../../utils/buildAuthResponse';
import { generateRandomToken, hashToken } from '../../utils/token';
import { sendPasswordResetEmail, sendVerificationEmail } from '../../utils/email';
import { issueTokens } from '../../utils/issueToken';
import { uploadImage } from '../../utils/uploadImage';
import { deleteImage } from '../../utils/deleteImage';

export const registerUser = async (name : string, email : string, password : string) => {
    const existingUser = await prisma.user.findUnique({
        where : {
            email
        }
    })
    if(existingUser !== null) {
        throw new AppError("An account with this email already exists.", 409);
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
    
    await sendVerificationEmail(createdUser.id,createdUser.email, createdUser.name);


    return {
        email: createdUser.email,
        message:
            "We've sent a verification email."
    };
}   


// Enumeration resistance: unknown email, wrong password, Google-only accounts
// and unverified accounts ALL return the identical generic 401. A pre-computed
// dummy hash equalizes bcrypt cost for the unknown-email branch.
const GENERIC_LOGIN_ERROR = "Invalid email or password.";
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("linkshift-timing-equalizer", 10);

export const loginUser = async (email : string, password : string) => {
    const existingUser = await prisma.user.findUnique({
        where : {
            email
        }
    })

    const rejectGeneric = async (): Promise<never> => {
        // Equalize bcrypt cost whether or not the account exists.
        await bcrypt.compare(password, existingUser?.passwordHash ?? DUMMY_PASSWORD_HASH);
        throw new AppError(GENERIC_LOGIN_ERROR, 401);
    };

    if (!existingUser) {
        return rejectGeneric();
    }

    if (!existingUser.verified) {
        // Same generic payload — recovery is via resend-verification, which is
        // itself enumeration-neutral.
        await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
        return rejectGeneric();
    }

    if(!existingUser.passwordHash) {
        // Google-only account: no local password to compare.
        await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
        return rejectGeneric();
    }

    const comparePass = await bcrypt.compare(password, existingUser.passwordHash);

    if(!comparePass) {
        return rejectGeneric();
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
                avatarUrl : existingGoogleUser.avatarPublicId
                ? existingGoogleUser.avatarUrl
                : avatarUrl,
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
                avatarUrl : existingUser.avatarPublicId
                ? existingUser.avatarUrl
                : avatarUrl,
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
    // Missing cookie (no cookie-parser entry at all) must be a clean 401 —
    // hashToken(undefined) would throw a TypeError and surface as a generic
    // 500 "Internal Server Error" instead.
    if (!token) {
        throw new AppError("Unauthorized", 401);
    }

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

export const uploadAvatarService = async(userId : string, file : Express.Multer.File) => {
    const user = await prisma.user.findUnique({
        where : {
            id : userId
        },
        select : {
            avatarPublicId : true
        }
    })

    if(!user) {
        throw new AppError("User not found", 404);
    }

    if(user.avatarPublicId) {
        await deleteImage(user.avatarPublicId);
    }

    const uploaded = await uploadImage(file, "avatars");

    const updatedAvatar = await prisma.user.update({
                            where : {
                                id : userId
                            },
                            data : {
                                avatarUrl : uploaded.url,
                                avatarPublicId : uploaded.publicId
                            }
                        })

    return updatedAvatar.avatarUrl;
}

export const deleteAvatarService = async(userId : string) => {
    const user = await prisma.user.findUnique({
        where : {
            id : userId
        },
        select: {
            id: true,
            avatarPublicId: true
        }
    })

    if(!user) {
        throw new AppError("User not found", 404);
    }

    if(user.avatarPublicId) {
        await deleteImage(user.avatarPublicId);
    }

    await prisma.user.update({
        where : {
            id  : user.id
        },
        data : {
            avatarUrl : null,
            avatarPublicId : null
        }
    })
    return ;
}


export const verifyEmailService = async(token : string) => {
    
    const hashedToken = hashToken(token);
    const verification  = await prisma.emailVerification.findFirst({
        where : {
            tokenHash :  hashedToken
        },
        include :{
            user : true
        }
    })

    if(!verification) {
        throw new AppError("Invalid Token", 400);
    }

    if(verification.expiresAt < new Date()) {
        await prisma.emailVerification.delete({
            where : {
                tokenHash : hashedToken
            }
        })
        throw new AppError("Verification link has expired. Please request a new verification email.", 410);
    }


    if(verification.user.verified) {
        await prisma.emailVerification.delete({
            where : {
                userId : verification.user.id
            }
        })
        return;
    }

    await prisma.user.update({
        where :{
            id : verification.user.id
        }, 
        data : {
            verified : true
        }
    })

    await prisma.emailVerification.delete({
            where : {
                userId : verification.user.id
            }
    })

    return;
}

export const resendVerificationService = async(email : string) => {
    // Enumeration-neutral: identical success response whether or not the
    // account exists / is already verified. Emails are sent only to real,
    // unverified accounts.
    const user = await prisma.user.findUnique({
        where : {
            email
        }
    })

    if(user && !user.verified) {
        await sendVerificationEmail(user.id, user.email, user.name);
    }

    return;

}
