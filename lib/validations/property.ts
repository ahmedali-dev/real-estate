import { z } from "zod";

const ownerSchema = z.object({
  name: z.string().trim().min(2, "Owner name is required."),
  phone: z.string().trim().min(5, "A valid phone number is required."),
  email: z.string().trim().email("Enter a valid email address.").optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const locationSchema = z.object({
  address: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required."),
  district: z.string().trim().max(120).optional().or(z.literal("")),
});

const roomCount = z.coerce.number().int().min(0).max(200).optional();

const detailsSchema = z.object({
  rooms: roomCount,
  bathrooms: roomCount,
  hasKitchen: z.boolean().optional(),
  kitchenCabinetsInstalled: z.boolean().optional(),
});

const unitSchema = z.object({
  label: z.string().trim().max(120).optional().or(z.literal("")),
  rooms: roomCount,
  bathrooms: roomCount,
  hasKitchen: z.boolean().optional(),
  kitchenCabinetsInstalled: z.boolean().optional(),
  electricityNumber: z.string().trim().max(60).optional().or(z.literal("")),
});

export const propertyInputSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters.").max(160),
    category: z.enum(["build", "apartment", "land"], {
      message: "Choose a valid category.",
    }),
    listingType: z.enum(["sale", "rent"], {
      message: "Choose sale or rent.",
    }),
    description: z.string().trim().min(10, "Description must be at least 10 characters.").max(5000),
    price: z.coerce.number({ message: "Price must be a number." }).positive("Price must be greater than 0."),
    rentalPeriod: z.enum(["monthly", "yearly"]).optional(),
    status: z.enum(["available", "sold", "rented"]).default("available"),
    owner: ownerSchema.optional(),
    location: locationSchema.optional(),
    details: detailsSchema.optional(),
    units: z.array(unitSchema).max(200).default([]),
    images: z.array(z.string().trim().min(1)).default([]),
    tiktokUrl: z
      .string()
      .trim()
      .url("Enter a valid URL.")
      .refine(
        (url) => /^https?:\/\/([\w-]+\.)?tiktok\.com\//i.test(url) || /^https?:\/\/vm\.tiktok\.com\//i.test(url),
        "Enter a valid TikTok video URL."
      )
      .optional()
      .or(z.literal("")),
  })
  // Core business rule: land is sale-only, never rent, never rentalPeriod.
  .superRefine((data, ctx) => {
    if (data.category === "land") {
      if (data.listingType !== "sale") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["listingType"],
          message: "Land listings can only be for sale.",
        });
      }
      if (data.rentalPeriod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rentalPeriod"],
          message: "Land listings cannot have a rental period.",
        });
      }
    }

    if (data.listingType === "rent" && !data.rentalPeriod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rentalPeriod"],
        message: "Select a rental period (monthly or yearly) for rentals.",
      });
    }

    if (data.listingType === "sale" && data.rentalPeriod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rentalPeriod"],
        message: "Rental period only applies to rentals.",
      });
    }

    if (data.listingType === "sale" && data.status === "rented") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "Only rental listings can be marked as rented.",
      });
    }

    if (data.listingType === "rent" && data.status === "sold") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "Only sale listings can be marked as sold.",
      });
    }

    if (data.category !== "build" && data.units.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["units"],
        message: "Only build listings can include apartment units.",
      });
    }
  });

export const propertyUpdateSchema = propertyInputSchema;

export type PropertyInput = z.infer<typeof propertyInputSchema>;

/** Formats ZodError into a flat field -> message map for easy UI display. */
export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "form";
    if (!out[path]) out[path] = issue.message;
  }
  return out;
}
