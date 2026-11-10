import { z } from "zod";

export const strongPasswordSchema = z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^a-zA-Z0-9]/, { message: "Password must contain at least one special character" });


export const createUserSchema = z
    .object({
        email: z
            .string()
            .min(1, "Email is required")
            .email("Invalid email address"),
        fullName: z
            .string()
            .min(2, "Full name must be at least 2 characters"),
        phone: z
            .string()
            .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"), // Bas
        password: strongPasswordSchema,
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"], // Sets the error specifically on the confirmPassword field
    });


export const EditUserSchema = z
    .object({
        email: z
            .string()
            .min(1, "Email is required")
            .email("Invalid email address"),
        fullName: z
            .string()
            .min(2, "Full name must be at least 2 characters"),
        phone: z
            .string()
            .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"), // Bas
        confirmPassword: z.string(),
    })


export const PasswordConfirmPasswordSchema = z.object({
    password: strongPasswordSchema,
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // Sets the error specifically on the confirmPassword field
});


// Extract the TypeScript type directly from the schema if needed
export type AdminUserForm = z.infer<typeof createUserSchema>;