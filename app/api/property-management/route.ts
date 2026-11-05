import { NextRequest, NextResponse } from "next/server";
import { requireListingsAccess, isBuildOnlyRole } from "@/lib/auth/requireSession";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { managementInput } from "@/lib/property-management";
import { literalSearch } from "@/lib/search";
import { Property } from "@/models/Property";
import { statusOptionsFor } from "@/types/property";

const fields = "title category listingType rentalPeriod status price management";
const idPattern = /^[a-f\d]{24}$/i;

export async function GET(req: NextRequest) {
  const { session, response } = await requireListingsAccess();
  if (response) return response;
  const params = req.nextUrl.searchParams;
  const id = params.get("id");
  if (id && !idPattern.test(id)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const category = params.get("category");
  const query: Record<string, unknown> = {};
  if (isBuildOnlyRole(session!.user.role)) query.category = "build";
  else if (category && ["build", "land", "apartment"].includes(category)) query.category = category;
  if (id) query._id = id;
  else if (params.get("mode") !== "all") query.$or = [{ management: { $exists: true } }, { managementRegistered: true }];
  const search = literalSearch(params.get("search"));
  if (search && !id) query.title = { $regex: search, $options: "i" };
  const page = Math.min(10000, Math.max(1, parseInt(params.get("page") || "1", 10) || 1));
  try {
    await connectToDatabase();
    const [data, total] = await Promise.all([
      Property.find(query).select(fields).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20).lean(),
      Property.countDocuments(query),
    ]);
    return NextResponse.json({ data, total }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "load" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { session, response } = await requireListingsAccess();
  if (response) return response;
  if (req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = managementInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { propertyId, status, ...management } = parsed.data;
  const scope = { _id: propertyId, ...(isBuildOnlyRole(session!.user.role) ? { category: "build" } : {}) };
  try {
    await connectToDatabase();
    const property = await Property.findOne(scope).select("listingType").lean();
    if (!property) return NextResponse.json({ error: "missing" }, { status: 404 });
    if (!statusOptionsFor(property.listingType).includes(status)) return NextResponse.json({ error: "status" }, { status: 400 });
    const data = await Property.findOneAndUpdate({ ...scope, listingType: property.listingType }, { $set: { management, status } }, { new: true, runValidators: true }).select(fields).lean();
    if (!data) return NextResponse.json({ error: "changed" }, { status: 409 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "save" }, { status: 500 });
  }
}
