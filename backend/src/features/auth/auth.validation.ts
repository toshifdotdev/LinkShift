import { z } from 'zod';

export const passwordValidation = z.string()
  .min(8, { message: "Password must be at least 8 characters long." })
  .max(64, { message: "Password cannot exceed 64 characters." })
  .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
  .regex(/[0-9]/, { message: "Password must contain at least one number." })
  .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character." });


export const registerUserSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters." })
    .max(50, { message: "Name cannot exceed 50 characters." }),
    
  email: z.string()
    .trim()
    .pipe(
      z.email({ message: "Invalid email format." })
    ),
    
  password: passwordValidation,
});

export const loginUserSchema = z.object({
  email: z.string()
    .trim()
    .pipe(
      z.email({ message: "Invalid email format." })
    ),
    
  password: z.string()
    .min(1, { message: "Password cannot be empty." }),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;