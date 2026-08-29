import { z } from 'zod';

export const passwordValidation = z.string()
  .min(8, { message: "Password must be at least 8 characters long." })
  .max(64, { message: "Password cannot exceed 64 characters." })
  .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
  .regex(/[0-9]/, { message: "Password must contain at least one number." })
  .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character." });

const emailValidation = z.string()
    .trim()
    .pipe(
      z.email({ message: "Invalid email format." })
    )



export const registerUserSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters." })
    .max(50, { message: "Name cannot exceed 50 characters." }),
    
  email: emailValidation,
    
  password: passwordValidation,
});

export const loginUserSchema = z.object({
  email:emailValidation,
    
  password: z.string()
    .min(1, { message: "Password cannot be empty." }),
});

export const forgotPasswordSchema = z.object({
  email: emailValidation
})


export const verifyEmailSchema = z.object({
    token: z
    .string("Token is required")
    .length(64, "Invalid token format")
    .regex(/^[a-f0-9]+$/i, "Invalid token format"),
});

export const resendVerificationSchema = z.object({
    email: emailValidation
});


export const resetPasswordSchema = z.object({
  token : z
    .string("Token is required")
    .length(64, "Invalid token format")
    .regex(/^[a-f0-9]+$/i, "Invalid token format"),
  password : passwordValidation
})

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { message: "Current password is required." })
    .optional(),
  newPassword: passwordValidation,
});


export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type forgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type resetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type verifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type resendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;