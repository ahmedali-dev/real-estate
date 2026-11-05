import { z } from "zod";
import type { Category, ListingStatus, ListingType, RentalPeriod } from "@/types/property";

export const managementInput = z.object({
  propertyId: z.string().regex(/^[a-f\d]{24}$/i),
  commissionRate: z.number().int().min(5).max(15),
  transactionAmount: z.number().positive().max(1_000_000_000_000).multipleOf(0.01).optional(),
  notes: z.string().trim().max(2000).default(""),
  status: z.enum(["available", "rented", "sold"]),
}).strict();

export interface ManagementDetails {
  commissionRate: number;
  transactionAmount?: number;
  notes: string;
}

export interface ManagedListing {
  _id: string;
  title: string;
  category: Category;
  listingType: ListingType;
  rentalPeriod?: RentalPeriod;
  status: ListingStatus;
  price?: number;
  management?: ManagementDetails;
}

export function commissionAmount(amount: number, rate: number): number {
  return Math.round(Math.round(amount * 100) * rate / 100) / 100;
}
