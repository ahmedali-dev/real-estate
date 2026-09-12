import { z } from "zod";

export const orderInputSchema = z.object({
  customerName: z.string().trim().min(2, "Customer name is required.").max(160),
  customerPhone: z.string().trim().min(5, "A valid phone number is required.").max(40),
  requestedCategory: z.enum(["apartment", "build", "land"], {
    message: "Choose what the customer is looking for.",
  }),
  requestedListingType: z.enum(["sale", "rent"]).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(["pending", "contacted", "fulfilled", "cancelled"]).default("pending"),
});

export type OrderInput = z.infer<typeof orderInputSchema>;

export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "form";
    if (!out[path]) out[path] = issue.message;
  }
  return out;
}
