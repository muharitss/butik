import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .toLowerCase()
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().trim().optional().nullable(),
  role: z.enum(["owner", "staff"], {
    errorMap: () => ({ message: "Role must be 'owner' or 'staff'" })
  }),
  temporaryPassword: z
    .string()
    .min(8, "Temporary password must be at least 8 characters")
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .toLowerCase()
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().trim().optional().nullable(),
  role: z.enum(["owner", "staff"], {
    errorMap: () => ({ message: "Role must be 'owner' or 'staff'" })
  }).optional()
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "New password must be at least 8 characters")
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true
} as const;

export interface SafeUserDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
}
