import mongoose, { Schema, type HydratedDocument, Model } from "mongoose";
import type { RequestedCategory, RequestedListingType, OrderStatus } from "@/types/order";

export interface OrderDocument {
  customerName: string;
  customerPhone: string;
  requestedCategory: RequestedCategory;
  requestedListingType?: RequestedListingType;
  notes?: string;
  status: OrderStatus;
  loggedBy?: {
    userId: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LoggedBySchema = new Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<OrderDocument>(
  {
    customerName: { type: String, required: true, trim: true, maxlength: 160 },
    customerPhone: { type: String, required: true, trim: true, maxlength: 40 },
    requestedCategory: {
      type: String,
      required: true,
      enum: ["apartment", "build", "land"],
    },
    requestedListingType: {
      type: String,
      enum: ["sale", "rent"],
      default: undefined,
    },
    notes: { type: String, trim: true, maxlength: 2000 },
    status: {
      type: String,
      required: true,
      enum: ["pending", "contacted", "fulfilled", "cancelled"],
      default: "pending",
    },
    loggedBy: { type: LoggedBySchema, required: false },
  },
  { timestamps: true }
);

// Land requests are always "sale" in this app (land has no rent option), so
// keep the request consistent with that rule too.
OrderSchema.pre("validate", function (next) {
  if (this.requestedCategory === "land") {
    this.requestedListingType = "sale";
  }
  next();
});

OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ customerName: "text", customerPhone: "text" });

export type OrderHydrated = HydratedDocument<OrderDocument>;

export const Order: Model<OrderDocument> =
  (mongoose.models.Order as Model<OrderDocument>) ||
  mongoose.model<OrderDocument>("Order", OrderSchema);
