import { z } from "zod";

export const updateMeetingUrlSchema = z.object({
  meetingUrl: z
    .string()
    .trim()
    .min(10, "Meeting URL is required")
    .max(2000, "URL too long")
    .url("Enter a valid URL")
    .refine((v) => v.startsWith("http://") || v.startsWith("https://"), "URL must start with http(s)"),
});
