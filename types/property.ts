export type Category = "build" | "apartment" | "land";
export type ListingType = "sale" | "rent";
export type RentalPeriod = "monthly" | "yearly";
export type ListingStatus = "available" | "sold" | "rented";

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
}

export interface ApartmentUnit {
  label?: string;
  rooms?: number;
  bathrooms?: number;
  hasKitchen?: boolean;
  kitchenCabinetsInstalled?: boolean;
  electricityNumber?: string;
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
  owner?: Owner;
  location?: Location;
  details?: PropertyDetails;
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
