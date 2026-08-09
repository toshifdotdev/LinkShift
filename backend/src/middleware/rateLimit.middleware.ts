import { rateLimit } from 'express-rate-limit';
// registerLimiter
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

// loginLimiter
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

// qrLimiter
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

// unlockLimiter
export const unlockLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many incorrect password attempts. Please try again after 15 minutes.',
    }
})

// forgotPassLimiter 
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


// resetPassLimiter
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

// resendVerificationLimiter

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

