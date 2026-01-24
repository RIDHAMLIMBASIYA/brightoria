import { z } from "zod";

// Centralized password validation used across auth-related UIs.
// Note: server-side/auth-provider settings should still enforce password rules.
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(72, "Password must be 72 characters or fewer")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character");

type ValidatePasswordOptions = {
  /** Used to block passwords containing the email local-part (e.g., john@… => "john"). */
  email?: string;
};

const COMMON_PASSWORD_SUBSTRINGS = [
  "password",
  "passw0rd",
  "admin",
  "qwerty",
  "letmein",
  "welcome",
  "iloveyou",
  "123456",
  "1234567",
  "12345678",
  "123456789",
];

function getEmailLocalPart(email?: string) {
  const e = (email ?? "").trim().toLowerCase();
  const at = e.indexOf("@");
  if (at <= 0) return null;
  const local = e.slice(0, at).trim();
  return local.length >= 3 ? local : null;
}

export function validatePassword(password: string, opts?: ValidatePasswordOptions): string | null {
  const res = passwordSchema.safeParse(password);
  if (!res.success) return res.error.issues[0]?.message ?? "Invalid password";

  const normalized = password.toLowerCase();

  // Block very common / guessable patterns.
  if (COMMON_PASSWORD_SUBSTRINGS.some((s) => normalized.includes(s))) {
    return "Password is too common. Choose something more unique.";
  }

  const local = getEmailLocalPart(opts?.email);
  if (local && normalized.includes(local)) {
    return "Password should not contain your email (or part of it).";
  }

  return null;
}
