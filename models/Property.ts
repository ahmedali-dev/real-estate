import mongoose, { Schema, type HydratedDocument, Model } from "mongoose";
import type { Category, ListingType, RentalPeriod, ListingStatus, Visibility, ResidencyType } from "@/types/property";

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

export interface PropertyDocument {
  title: string;
  category: Category;
  listingType: ListingType;
  description: string;
  price: number;
  rentalPeriod?: RentalPeriod;
  status: ListingStatus;
  visibility: Visibility;
  owner?: {
    name: string;
    phone: string;
    email?: string;
    notes?: string;
  };
  location?: {
    address?: string;
    city: string;
    district?: string;
  };
  details?: PropertyDetails;
  tenant?: Tenant;
  units: ApartmentUnit[];
  images: string[];
  tiktokUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OwnerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const LocationSchema = new Schema(
  {
    address: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, trim: true },
  },
  { _id: false }
);

const DetailsSchema = new Schema(
  {
    rooms: { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },
    hasKitchen: { type: Boolean },
    kitchenCabinetsInstalled: { type: Boolean },
    residencyType: { type: String, enum: ["family", "singles", "women_only"] },
  },
  { _id: false }
);

const TenantSchema = new Schema(
  {
    name: { type: String, trim: true },
    idNumber: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false }
);

const UnitSchema = new Schema(
  {
    name: { type: String, trim: true },
    number: { type: String, trim: true },
    rooms: { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },
    hasKitchen: { type: Boolean },
    kitchenCabinetsInstalled: { type: Boolean },
    electricityNumber: { type: String, trim: true },
    residencyType: { type: String, enum: ["family", "singles", "women_only"] },
    tenant: { type: TenantSchema, required: false },
  },
  { _id: false }
);

const PropertySchema = new Schema<PropertyDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    category: {
      type: String,
      required: true,
      enum: ["build", "apartment", "land"],
    },
    listingType: {
      type: String,
      required: true,
      enum: ["sale", "rent"],
    },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    price: { type: Number, required: true, min: 0 },
    rentalPeriod: {
      type: String,
      enum: ["monthly", "yearly"],
      default: undefined,
    },
    status: {
      type: String,
      required: true,
      enum: ["available", "sold", "rented"],
      default: "available",
    },
    visibility: {
      type: String,
      required: true,
      enum: ["public", "private"],
      default: "public",
    },
    owner: { type: OwnerSchema, required: false },
    location: { type: LocationSchema, required: false },
    details: { type: DetailsSchema, required: false },
    tenant: { type: TenantSchema, required: false },
    units: {
      type: [UnitSchema],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    tiktokUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

/**
 * Core business rule, enforced at the database layer so it can never be
 * bypassed regardless of which code path writes to the collection:
 * land listings must be sale-only and must never carry a rental period.
 */
function enforceLandSaleOnly(doc: Partial<PropertyDocument>) {
  if (doc.category === "land") {
    if (doc.listingType && doc.listingType !== "sale") {
      throw new Error("Land listings must have listingType 'sale'.");
    }
    doc.listingType = "sale";
    doc.rentalPeriod = undefined;
  }
  if (doc.listingType === "sale") {
    doc.rentalPeriod = undefined;
  }
}

/**
 * A listing's status must be consistent with its listing type: only
 * "sale" listings can be marked "sold", and only "rent" listings can be
 * marked "rented". "available" is valid for both.
 */
function enforceStatusConsistency(doc: Partial<PropertyDocument>) {
  if (!doc.status) return;
  if (doc.listingType === "sale" && doc.status === "rented") {
    throw new Error("Only rental listings can be marked as rented.");
  }
  if (doc.listingType === "rent" && doc.status === "sold") {
    throw new Error("Only sale listings can be marked as sold.");
  }
}

/**
 * Apartment units (a build's internal breakdown of individual apartments)
 * only make sense for the "build" category. Any other category has its
 * units array cleared automatically.
 */
function enforceUnitsOnlyForBuilds(doc: Partial<PropertyDocument>) {
  if (doc.category !== "build" && doc.units && doc.units.length > 0) {
    doc.units = [];
  }
}

/**
 * Tenant records (name, ID number, phone) only make sense for rentals.
 * If a listing (or a unit's parent listing) is switched to "sale", any
 * tenant info is cleared automatically rather than left stale.
 */
function enforceTenantOnlyForRentals(doc: Partial<PropertyDocument>) {
  if (doc.listingType !== "rent") {
    doc.tenant = undefined;
    if (doc.units) {
      doc.units = doc.units.map((u) => ({ ...u, tenant: undefined }));
    }
  }
}

PropertySchema.pre("validate", function (next) {
  try {
    enforceLandSaleOnly(this as unknown as Partial<PropertyDocument>);
    enforceStatusConsistency(this as unknown as Partial<PropertyDocument>);
    enforceUnitsOnlyForBuilds(this as unknown as Partial<PropertyDocument>);
    enforceTenantOnlyForRentals(this as unknown as Partial<PropertyDocument>);
    next();
  } catch (err) {
    next(err as Error);
  }
});

// Guard findOneAndUpdate / findByIdAndUpdate paths too, since pre('validate')
// on the document does not run for query-based updates by default.
PropertySchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() as Record<string, any> | null;
  if (!update) return next();

  const flat: Record<string, any> = update.$set ?? update;
  const unset: Record<string, string> = { ...(update.$unset ?? {}) };

  if (flat.category === "land") {
    if (flat.listingType && flat.listingType !== "sale") {
      return next(new Error("Land listings must have listingType 'sale'."));
    }
    flat.listingType = "sale";
    delete flat.rentalPeriod;
    unset.rentalPeriod = "";
  }
  if (flat.status) {
    if (flat.listingType === "sale" && flat.status === "rented") {
      return next(new Error("Only rental listings can be marked as rented."));
    }
    if (flat.listingType === "rent" && flat.status === "sold") {
      return next(new Error("Only sale listings can be marked as sold."));
    }
  }
  if (flat.category && flat.category !== "build" && Array.isArray(flat.units) && flat.units.length > 0) {
    flat.units = [];
  }
  if (flat.listingType && flat.listingType !== "rent") {
    delete flat.tenant;
    unset.tenant = "";
    if (Array.isArray(flat.units)) {
      flat.units = flat.units.map((u: Record<string, any>) => {
        const { tenant, ...rest } = u;
        return rest;
      });
    }
  }

  if (Object.keys(unset).length > 0) {
    update.$unset = unset;
  }
  next();
});

PropertySchema.index({ title: "text", "location.city": "text", "location.district": "text" });
PropertySchema.index({ category: 1, listingType: 1 });
PropertySchema.index({ status: 1 });
PropertySchema.index({ visibility: 1 });
PropertySchema.index({ price: 1 });
PropertySchema.index({ createdAt: -1 });

export type PropertyHydrated = HydratedDocument<PropertyDocument>;

export const Property: Model<PropertyDocument> =
  (mongoose.models.Property as Model<PropertyDocument>) ||
  mongoose.model<PropertyDocument>("Property", PropertySchema);
