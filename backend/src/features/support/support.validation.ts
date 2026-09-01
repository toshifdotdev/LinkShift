import { z } from "zod";

export const contactSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100, "Name cannot exceed 100 characters."),
    email: z.string().trim().pipe(z.email({ message: "Invalid email format." })),
    topic: z.enum(["support", "billing", "privacy", "abuse", "other"]),
    message: z.string().trim().min(10, "Message must be at least 10 characters.").max(5000, "Message cannot exceed 5000 characters."),
});

export const feedbackSchema = z.object({
    category: z.enum(["general", "bug", "idea"]),
    message: z.string().trim().min(10, "Feedback must be at least 10 characters.").max(5000, "Feedback cannot exceed 5000 characters."),
});
