import mongoose, { Schema, type HydratedDocument, Model } from "mongoose";

export interface ElectricalReadingDocument {
  electricityNumber: string;
  watts: number;
  kwh: number;
  costBs: number;
  recordedAt: Date;
  createdAt: Date;
}

const ElectricalReadingSchema = new Schema<ElectricalReadingDocument>(
  {
    electricityNumber: { type: String, required: true, trim: true, index: true },
    watts: { type: Number, required: true, min: 0 },
    kwh: { type: Number, required: true, min: 0 },
    costBs: { type: Number, required: true, min: 0 },
    recordedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ElectricalReadingSchema.index({ electricityNumber: 1, recordedAt: -1 });

export type ElectricalReadingHydrated = HydratedDocument<ElectricalReadingDocument>;

export const ElectricalReading: Model<ElectricalReadingDocument> =
  (mongoose.models.ElectricalReading as Model<ElectricalReadingDocument>) ||
  mongoose.model<ElectricalReadingDocument>("ElectricalReading", ElectricalReadingSchema);
