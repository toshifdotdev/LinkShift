import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { createVisitorRateLimitHandler } from './error.middleware';








type UserLimiterOptions = {
    windowMs: number;
    limit: number;
    message: { success: boolean; message: string };
};

export const createUserRateLimiter = ({ windowMs, limit, message }: UserLimiterOptions) =>
    rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        keyGenerator: (req: Request, _res: Response) => {
            const userId = (req as any).auth?.id;
            
            
            return userId ? `u:${userId}` : `ip:${ipKeyGenerator(req.ip ?? "")}`;
        },
        message,
    });

export const linkMutationLimiter = createUserRateLimiter({
    windowMs: 60_000,
    limit: 30,
    message: { success: false, message: "Too many link operations. Please slow down." },
});

export const domainMutationLimiter = createUserRateLimiter({
    windowMs: 60_000,
    limit: 10,
    message: { success: false, message: "Too many domain operations. Please slow down." },
});

export const billingMutationLimiter = createUserRateLimiter({
    windowMs: 60_000,
    limit: 10,
    message: { success: false, message: "Too many billing operations. Please slow down." },
});


export const changePasswordLimiter = createUserRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: { success: false, message: "Too many password change attempts. Please wait a bit." },
});

export const deleteAccountLimiter = createUserRateLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    message: { success: false, message: "Too many account deletion attempts. Please try again later." },
});





const REDIRECT_LIMIT_MESSAGE = {
    success: false,
    message: 'Too many requests. Please slow down.',
};

export const redirectLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: REDIRECT_LIMIT_MESSAGE,
    handler: createVisitorRateLimitHandler(REDIRECT_LIMIT_MESSAGE),
});

export const registerLimiter = rateLimit({
    windowMs :  60 * 60 * 1000, // 1 hr
    limit : 5,
    standardHeaders : 'draft-7',
    legacyHeaders : false,
    message : {
        success : false,
        message: 'Too many accounts created from this IP. Please try again after an hour.'
    }
})


export const loginLimiter = rateLimit({
    windowMs : 15 * 60 * 1000, // 15min
    limit : 10,
    standardHeaders : 'draft-7',
    legacyHeaders : false,
    message : {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
})


export const qrLimiter = rateLimit({
    windowMs : 1 * 60 * 1000,
    limit : 30,
    standardHeaders : 'draft-7',
    legacyHeaders : false,
    message: {
        success: false,
        message: 'Too many QR code requests. Please slow down.',
  },
})


const UNLOCK_LIMIT_MESSAGE = {
    success: false,
    message: 'Too many incorrect password attempts. Please try again after 15 minutes.',
};

export const unlockLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: UNLOCK_LIMIT_MESSAGE,
    handler: createVisitorRateLimitHandler(UNLOCK_LIMIT_MESSAGE),
});


export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests from this device. Please try again after an hour.',
  },
});



export const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  limit: 10, 
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again after an hour.',
  },
});



export const resendVerificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 3,
    standardHeaders: true, 
    legacyHeaders: false, 
    message: {
        success: false,
        message: "Too many verification emails sent from this IP. Please try again after 15 minutes."
    },
});


export const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many messages sent from this device. Please try again after an hour.",
    },
});


export const feedbackLimiter = createUserRateLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    message: { success: false, message: "Too much feedback. Please try again after an hour." },
});

