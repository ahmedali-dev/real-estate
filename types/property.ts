export type Category = "build" | "apartment" | "land";
export type ListingType = "sale" | "rent";
export type RentalPeriod = "monthly" | "yearly";
export type ListingStatus = "available" | "sold" | "rented";
/** Public listings show up for anyone browsing; private listings only show
 * to signed-in staff (dashboard, direct edit link) — they're excluded from
 * public browse pages and 404 for a signed-out visitor who hits the direct
 * URL. */
export type Visibility = "public" | "private";
/** Who a listing (or a specific unit within a build) is suitable for. Common
 * classification in Gulf-region residential real estate. Left undefined
 * means no restriction. */
export type ResidencyType = "family" | "singles" | "women_only";

export interface Owner {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface Location {
  address?: string;
  city: string;
  district?: string;
}

export interface PropertyDetails {
  rooms?: number;
  bathrooms?: number;
  hasKitchen?: boolean;
  kitchenCabinetsInstalled?: boolean;
  residencyType?: ResidencyType;
}

export interface Tenant {
  name?: string;
  idNumber?: string;
  phone?: string;
}

export interface ApartmentUnit {
  name?: string;
  number?: string;
  rooms?: number;
  bathrooms?: number;
  hasKitchen?: boolean;
  kitchenCabinetsInstalled?: boolean;
  electricityNumber?: string;
  residencyType?: ResidencyType;
  tenant?: Tenant;
}

export interface PropertyDTO {
  _id: string;
  title: string;
  category: Category;
  listingType: ListingType;
  description: string;
  price: number;
  rentalPeriod?: RentalPeriod;
  status: ListingStatus;
  visibility: Visibility;
  owner?: Owner;
  location?: Location;
  details?: PropertyDetails;
  tenant?: Tenant;
  units: ApartmentUnit[];
  images: string[];
  tiktokUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyListResponse {
  data: PropertyDTO[];
  total: number;
  stats: {
    total: number;
    builds: number;
    apartments: number;
    lands: number;
    forSale: number;
    forRent: number;
    available: number;
    sold: number;
    rented: number;
  };
}

export interface ApiError {
  error: string;
  fieldErrors?: Record<string, string>;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  build: "Build / Property",
  apartment: "Apartment",
  land: "Land",
};

export const CATEGORY_SHORT_LABELS: Record<Category, string> = {
  build: "Build",
  apartment: "Apartment",
  land: "Land",
};

export const STATUS_LABELS: Record<ListingStatus, string> = {
  available: "Available",
  sold: "Sold",
  rented: "Rented",
};

/** Which statuses are valid for a given listing type. */
export function statusOptionsFor(listingType: ListingType): ListingStatus[] {
  return listingType === "sale" ? ["available", "sold"] : ["available", "rented"];
}
