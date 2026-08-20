import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Property } from "@/models/Property";
import { serializeProperty } from "@/lib/mongodb/serialize";
import { propertyUpdateSchema, flattenZodErrors } from "@/lib/validations/property";

export const dynamic = "force-dynamic";

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

// GET /api/properties/:id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid listing id." }, { status: 400 });
    }
    await connectToDatabase();

    const doc = await Property.findById(params.id);
    if (!doc) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    return NextResponse.json({ data: serializeProperty(doc) }, { status: 200 });
  } catch (err) {
    console.error(`GET /api/properties/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to load listing." }, { status: 500 });
  }
}

// PUT /api/properties/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid listing id." }, { status: 400 });
    }
    await connectToDatabase();

    const json = await req.json();
    const parsed = propertyUpdateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: flattenZodErrors(parsed.error) },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const payload = {
      ...data,
      rentalPeriod: data.listingType === "rent" ? data.rentalPeriod : undefined,
      tiktokUrl: data.tiktokUrl || undefined,
      owner: data.owner
        ? {
            ...data.owner,
            email: data.owner.email || undefined,
            notes: data.owner.notes || undefined,
          }
        : undefined,
      location: data.location
        ? {
            ...data.location,
            address: data.location.address || undefined,
            district: data.location.district || undefined,
          }
        : undefined,
      details: data.details,
      units: data.category === "build" ? data.units : [],
    };

    // $set can't clear a field by omitting it — fields that are now
    // undefined (owner/location removed, no rental period, no TikTok link)
    // need an explicit $unset, or the previous value would linger in Mongo.
    const unset: Record<string, ""> = {};
    const set: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined) {
        if (["rentalPeriod", "tiktokUrl", "owner", "location", "details"].includes(key)) {
          unset[key] = "";
        }
      } else {
        set[key] = value;
      }
    }

    const updated = await Property.findByIdAndUpdate(
      params.id,
      { $set: set, $unset: unset },
      { new: true, runValidators: true, context: "query" }
    );

    if (!updated) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    return NextResponse.json({ data: serializeProperty(updated) }, { status: 200 });
  } catch (err) {
    console.error(`PUT /api/properties/${params.id} failed:`, err);
    const message = err instanceof Error ? err.message : "Failed to update listing.";
    if (
      (err instanceof Error && err.name === "ValidationError") ||
      /Land listings/.test(message)
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update listing." }, { status: 500 });
  }
}

// DELETE /api/properties/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid listing id." }, { status: 400 });
    }
    await connectToDatabase();

    const deleted = await Property.findByIdAndDelete(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    return NextResponse.json({ data: { _id: params.id } }, { status: 200 });
  } catch (err) {
    console.error(`DELETE /api/properties/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete listing." }, { status: 500 });
  }
}
