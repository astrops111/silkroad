import { z } from "zod/v4";

const emailField = z
  .email("Please enter a valid email address")
  .max(254, "Email address is too long");

const nameField = (label: string) =>
  z.string().trim().min(2, `${label} is required`).max(100, `${label} is too long`);

export const loginSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password is too long"),
});

export const registerSchema = z
  .object({
    email: emailField,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long")
      .regex(/[A-Za-z]/, "Password must include at least one letter")
      .regex(/[0-9]/, "Password must include at least one number"),
    confirmPassword: z.string().max(128),
    fullName: nameField("Full name"),
    role: z.enum(["buyer", "supplier"]),
    companyName: z.string().trim().min(2, "Company name is required").max(200),
    countryCode: z.string().length(2, "Please select a country"),
    marketRegion: z.enum([
      "africa_west",
      "africa_east",
      "africa_south",
      "africa_central",
      "africa_north",
      "cn",
      "global",
    ]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long")
      .regex(/[A-Za-z]/, "Password must include at least one letter")
      .regex(/[0-9]/, "Password must include at least one number"),
    confirmPassword: z.string().max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
