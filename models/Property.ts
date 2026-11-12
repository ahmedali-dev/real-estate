import type { ManagementDetails } from "@/lib/property-management";
import mongoose, { Schema, type HydratedDocument, Model } from "mongoose";
import type { Category, ListingType, RentalPeriod, ListingStatus, Visibility, ResidencyType } from "@/types/property";

export interface PropertyDetails {
  rooms?: number;
  bathrooms?: number;
  hasKitchen?: boolean;
  kitchenCabinetsInstalled?: boolean;
  acInstalled?: boolean;
  residencyType?: ResidencyType;
}

export interface Tenant {
  name?: string;
  idNumber?: string;
  phone?: string;
}

export interface ApartmentUnit {
  isRented?: boolean;
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
  propertyType?: "villa" | "apartment" | "duplex" | "floor" | "shop" | "other";
  managementRevision?: number;
  managementRegistered?: boolean;
  management?: ManagementDetails;
  broughtBy?: { userId: string; name: string };

  listingType: ListingType;
  description: string;
  price?: number;
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
    city?: string;
    mapUrl?: string;
    district?: string;
  };
  details?: PropertyDetails;
  tenant?: Tenant;
  units: ApartmentUnit[];
  images: string[];
  tiktokUrl?: string;
  localVideo?: string;
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
    city: { type: String, trim: true },
    mapUrl: { type: String, trim: true },
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
    acInstalled: { type: Boolean },
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
    isRented: { type: Boolean },
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
    propertyType: { type: String, enum: ["villa", "apartment", "duplex", "floor", "shop", "other"] },
    managementRevision: { type: Number, default: 0 },
    managementRegistered: { type: Boolean, default: false },
    management: { type: new Schema<ManagementDetails>({
      commissionRate: { type: Number, required: true, min: 5, max: 15, validate: Number.isInteger },
      transactionAmount: { type: Number, min: 0, max: 1_000_000_000_000 },
      notes: { type: String, default: "", maxlength: 2000 },
    }, { _id: false }), default: undefined },
    broughtBy: { userId: { type: String }, name: { type: String } },
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
    price: { type: Number, min: 0 },
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
    localVideo: { type: String },
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
 * A building can be for sale while individual apartments remain rented.
 * Explicitly rented units retain their tenant records independently of
 * the parent listing type; unrented units clear their tenant information.
 */
function enforceTenantOnlyForRentals(doc: Partial<PropertyDocument>) {
  if (doc.listingType !== "rent") {
    doc.tenant = undefined;
    if (doc.units) {
      for (const unit of doc.units) {
        if (unit.isRented !== true) unit.tenant = undefined;
      }
    }
  }
}

PropertySchema.pre("validate", function (next) {
  try {
    enforceLandSaleOnly(this as unknown as Partial<PropertyDocument>);
    enforceStatusConsistency(this as unknown as Partial<PropertyDocument>);
    enforceUnitsOnlyForBuilds(this as unknown as Partial<PropertyDocument>);
    enforceTenantOnlyForRentals(this as unknown as Partial<PropertyDocument>);
    for (const unit of this.units ?? []) {
      if (unit.isRented === false) unit.tenant = undefined;
    }
    next();
  } catch (err) {
    next(err as Error);
  }
});

// Guard findOneAndUpdate / findByIdAndUpdate paths too, since pre('validate')
// on the document does not run for query-based updates by default.
PropertySchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() as Record<string, unknown> | null;
  if (!update) return next();

  const flat = (update.$set ?? update) as Record<string, unknown>;
  const unset: Record<string, string> = { ...((update.$unset ?? {}) as Record<string, string>) };

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
      flat.units = flat.units.map((u: Record<string, unknown>) => {
        if (u.isRented === true) return u;
        const rest = { ...u };
        delete rest.tenant;
        return rest;
      });
    }
  }

  if (Array.isArray(flat.units)) {
    flat.units = flat.units.map((u: Record<string, unknown>) => {
      if (u.isRented !== false) return u;
      const rest = { ...u };
        delete rest.tenant;
      return rest;
    });
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

// Next.js hot reload can retain a model compiled before these fields existed.
// Mongoose silently strips unknown fields from updates, so replace that stale
// model rather than losing the selected offer source or property type.
const cachedProperty = mongoose.models.Property as Model<PropertyDocument> | undefined;
if (cachedProperty && (!cachedProperty.schema.path("localVideo") || !cachedProperty.schema.path("broughtBy.userId") || !cachedProperty.schema.path("propertyType") || !cachedProperty.schema.path("management") || !cachedProperty.schema.path("managementRegistered") || !cachedProperty.schema.path("managementRevision"))) {
  mongoose.deleteModel("Property");
}

export const Property: Model<PropertyDocument> =
  (mongoose.models.Property as Model<PropertyDocument>) ||
  mongoose.model<PropertyDocument>("Property", PropertySchema);
