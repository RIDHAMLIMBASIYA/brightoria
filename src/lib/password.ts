import { z } from "zod";

// Centralized password validation used across auth-related UIs.
// Note: server-side/auth-provider settings should still enforce password rules.
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character");

export function validatePassword(password: string): string | null {
  const res = passwordSchema.safeParse(password);
  if (res.success) return null;
  return res.error.issues[0]?.message ?? "Invalid password";
}
