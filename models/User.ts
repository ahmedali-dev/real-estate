import mongoose, { Schema, type HydratedDocument, Model } from "mongoose";

export type UserRole = "admin" | "real_estate_officer" | "sales_officer" | "project_manager";

export interface UserDocument {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 200,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["admin", "real_estate_officer", "sales_officer", "project_manager"],
      default: "real_estate_officer",
    },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

export type UserHydrated = HydratedDocument<UserDocument>;

export const User: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument>) || mongoose.model<UserDocument>("User", UserSchema);
