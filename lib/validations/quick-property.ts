import { z } from "zod";
import { isGoogleMapsUrl } from "@/lib/maps";

export const quickPropertySchema = z.object({
  description: z.string().trim().min(10, "Description must be at least 10 characters.").max(5000).optional(),
  price: z.number().positive().finite().nullable().optional(),
  status: z.enum(["available", "sold", "rented"]).optional(),
  tiktokUrl: z.string().trim().max(4096).refine(value => {
    if (!value) return true;
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && (url.hostname === "tiktok.com" || url.hostname.endsWith(".tiktok.com")); } catch { return false; }
  }, "Enter a valid HTTPS TikTok URL.").optional(),
  mapUrl: z.string().trim().max(4096).refine(value => !value || isGoogleMapsUrl(value), "Enter a Google Maps location URL.").optional(),
}).strict().refine(value => Object.keys(value).length > 0, "Choose a field to update.");
