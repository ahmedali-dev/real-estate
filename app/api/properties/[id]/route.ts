import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { User } from "@/models/User";
import { Property } from "@/models/Property";
import { serializeProperty } from "@/lib/mongodb/serialize";
import { propertyUpdateSchema, flattenZodErrors } from "@/lib/validations/property";
import { requireListingsAccess, requireAdmin, isBuildOnlyRole } from "@/lib/auth/requireSession";

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

    const session = await getServerSession(authOptions);
    if (doc.visibility === "private") {
      if (!session?.user) {
        // Same response as "doesn't exist" — a private listing's existence
        // shouldn't be distinguishable from a wrong ID to a signed-out visitor.
        return NextResponse.json({ error: "Listing not found." }, { status: 404 });
      }
    }

    return NextResponse.json({ data: serializeProperty(doc, Boolean(session?.user)) }, { status: 200 });
  } catch (err) {
    console.error(`GET /api/properties/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to load listing." }, { status: 500 });
  }
}

// PUT /api/properties/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, response: authError } = await requireListingsAccess();
  if (authError) return authError;

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

    if (isBuildOnlyRole(session!.user.role)) {
      if (data.category !== "build") {
        return NextResponse.json(
          { error: "Project managers can only manage build listings." },
          { status: 403 }
        );
      }
      const existing = await Property.findById(params.id).select("category");
      if (existing && existing.category !== "build") {
        return NextResponse.json(
          { error: "Project managers can only manage build listings." },
          { status: 403 }
        );
      }
    }
    const selectedUser = data.broughtByUserId ? await User.findById(data.broughtByUserId).select("name active") : null;
    if (data.broughtByUserId && !selectedUser) {
      return NextResponse.json({ error: "Choose an existing system user.", fieldErrors: { broughtByUserId: "User no longer exists." } }, { status: 400 });
    }
    const payload = {
      ...data,
      propertyType: data.category === "apartment" ? data.propertyType : undefined,
      broughtBy: selectedUser ? { userId: selectedUser._id.toString(), name: selectedUser.name } : undefined,
      price: data.price,
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
        if (["propertyType", "broughtBy", "price", "rentalPeriod", "tiktokUrl", "owner", "location", "details", "tenant"].includes(key)) {
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

    return NextResponse.json({ data: serializeProperty(updated, true) }, { status: 200 });
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
  const { response: authError } = await requireAdmin();
  if (authError) return authError;

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

// Targeted quick edits preserve all unrelated listing fields.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, response } = await requireListingsAccess();
  if (response) return response;
  if (req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isValidId(params.id)) return NextResponse.json({ error: "Invalid listing id." }, { status: 400 });
  try {
    const json = await req.json();
    // Reuse the field validators without requiring a complete listing payload.
    const parsed = (await import("@/lib/validations/quick-property")).quickPropertySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed.", fieldErrors: flattenZodErrors(parsed.error) }, { status: 400 });
    await connectToDatabase();
    const doc = await Property.findById(params.id);
    if (!doc) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    if (isBuildOnlyRole(session!.user.role) && doc.category !== "build") return NextResponse.json({ error: "Project managers can only manage build listings." }, { status: 403 });
    const data = parsed.data;
    if ((data.status === "sold" && doc.listingType !== "sale") || (data.status === "rented" && doc.listingType !== "rent")) return NextResponse.json({ error: "Availability must match the listing type." }, { status: 400 });
    const set: Record<string, unknown> = {};
    const unset: Record<string, string> = {};
    if ("price" in data) { if (data.price === null) unset.price = ""; else set.price = data.price; }
    if (data.status) set.status = data.status;
    if ("tiktokUrl" in data) { if (data.tiktokUrl) set.tiktokUrl = data.tiktokUrl; else unset.tiktokUrl = ""; }
    if ("mapUrl" in data) { if (data.mapUrl) set["location.mapUrl"] = data.mapUrl; else unset["location.mapUrl"] = ""; }
    const updated = await Property.findOneAndUpdate({ _id: params.id, listingType: doc.listingType, category: doc.category }, { $set: set, $unset: unset }, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ error: "Listing changed. Refresh and try again." }, { status: 409 });
    return NextResponse.json({ data: serializeProperty(updated, true) });
  } catch { return NextResponse.json({ error: "Failed to update listing." }, { status: 500 }); }
}
