import { z } from "zod";

export const loginInputSchema = z.object({
  email: z.string().trim().email("Invalid email format").toLowerCase(),
  password: z.string().min(1, "Password is required")
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export interface AuthUserResponse {
  id: string;
  name: string;
  email: string | null;
  role: string;
  isActive: boolean;
}

export interface SessionTokenPayload {
  userId: string;
  role: string;
}
