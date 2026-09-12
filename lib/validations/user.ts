import { z } from "zod";

const ROLES = ["admin", "real_estate_officer", "sales_officer", "project_manager"] as const;

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(160),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(ROLES).default("real_estate_officer"),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(160).optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8, "Password must be at least 8 characters.").optional().or(z.literal("")),
});

export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "form";
    if (!out[path]) out[path] = issue.message;
  }
  return out;
}
