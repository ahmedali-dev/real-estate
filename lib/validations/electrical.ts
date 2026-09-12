import { z } from "zod";

export const electricalReadingInputSchema = z.object({
  electricityNumber: z.string().trim().min(1, "Choose a meter."),
  watts: z.coerce.number({ message: "Watts must be a number." }).min(0, "Watts can't be negative."),
  kwh: z.coerce.number({ message: "kWh must be a number." }).min(0, "kWh can't be negative."),
  recordedAt: z.string().datetime().optional(),
});

export type ElectricalReadingInput = z.infer<typeof electricalReadingInputSchema>;

export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "form";
    if (!out[path]) out[path] = issue.message;
  }
  return out;
}
