import { dashboardFilterConditions } from "@/lib/dashboard-filters";
import { literalSearch } from "@/lib/search";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { User } from "@/models/User";
import { Property } from "@/models/Property";
import { serializeProperty } from "@/lib/mongodb/serialize";
import { propertyInputSchema, flattenZodErrors } from "@/lib/validations/property";
import type { PropertyListResponse } from "@/types/property";
import { requireListingsAccess, isBuildOnlyRole } from "@/lib/auth/requireSession";

export const dynamic = "force-dynamic";

// GET /api/properties?category=&listingType=&search=&sortBy=&sortDir=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // Not gated with requireListingsAccess — browsing public listings needs
    // no login. But an unauthenticated caller must never see (or even
    // learn the existence of, via stats) a private listing, so detect the
    // session without blocking the request either way.
    const session = await getServerSession(authOptions);
    const isStaff = Boolean(session?.user);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const listingType = searchParams.get("listingType");
    const status = searchParams.get("status");
    const visibilityParam = searchParams.get("visibility");
    const search = literalSearch(searchParams.get("search"));
    const sortBy = searchParams.get("sortBy") ?? "createdAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? 1 : -1;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 24)));

    const filter: Record<string, unknown> = {};
    if (category && ["build", "apartment", "land"].includes(category)) {
      filter.category = category;
    }
    if (listingType && ["sale", "rent"].includes(listingType)) {
      filter.listingType = listingType;
    }
    if (status && ["available", "sold", "rented"].includes(status)) {
      filter.status = status;
    }
    if (!isStaff) {
      // Signed-out visitors only ever see public listings — this
      // overrides any visibility value they might try to pass.
      filter.visibility = "public";
    } else if (visibilityParam && ["public", "private"].includes(visibilityParam)) {
      filter.visibility = visibilityParam;
    }

    // Build $or-based conditions (search, residency type) separately and
    // combine with $and — assigning to filter.$or twice would silently
    // clobber the first one instead of combining them.
    const andConditions: Record<string, unknown>[] = [];
    // Office completeness filters are deliberately unavailable to public requests.
    if (isStaff) {
      for (const [parameter, field] of [["hasPrice", "price"], ["hasImages", "images.0"], ["hasTikTok", "tiktokUrl"], ["hasMap", "location.mapUrl"]]) {
        const choice = searchParams.get(parameter);
        if (choice !== "yes" && choice !== "no") continue;
        const present = { [field]: { $exists: true, $nin: [null, ""] } };
        const absent = { $or: [{ [field]: { $exists: false } }, { [field]: null }, { [field]: "" }] };
        andConditions.push(choice === "yes" ? present : absent);
      }
    }
    if (isStaff) {
      try { andConditions.push(...dashboardFilterConditions(searchParams, category)); }
      catch (error) { if (error instanceof RangeError) return NextResponse.json({ error: error.message }, { status: 400 }); throw error; }
    }
    if (search) {
      andConditions.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { "location.city": { $regex: search, $options: "i" } },
          { "location.district": { $regex: search, $options: "i" } },
          { "location.address": { $regex: search, $options: "i" } },
        ],
      });
    }
    if (category !== "land") {
      const propertyType = searchParams.get("propertyType");
      if (propertyType && ["villa", "apartment", "duplex", "floor", "shop", "other"].includes(propertyType)) {
        andConditions.push(propertyType === "apartment" ? { category: "apartment", $or: [{ propertyType: "apartment" }, { propertyType: { $exists: false } }] } : { propertyType });
      }
      const rooms = Number(searchParams.get("rooms"));
      if (!isStaff && Number.isFinite(rooms) && rooms > 0) filter["details.rooms"] = { $gte: rooms };
    }
    const priceRange: Record<string, number> = {};
    for (const [parameter, operator] of [["minPrice", "$gte"], ["maxPrice", "$lte"]]) {
      const raw = searchParams.get(parameter);
      const value = Number(raw);
      if (raw && Number.isFinite(value) && value >= 0) priceRange[operator] = value;
    }
    if (Object.keys(priceRange).length) filter.price = priceRange;
    const location = searchParams.get("location")?.trim();
    if (location) {
      const literal = location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      andConditions.push({ $or: ["city", "district", "address"].map(key => ({ [`location.${key}`]: { $regex: literal, $options: "i" } })) });
    }
    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const allowedSort = new Set(["price", "createdAt", "updatedAt", "title"]);
    const sortField = allowedSort.has(sortBy) ? sortBy : "createdAt";

    const [docs, total, statsAgg] = await Promise.all([
      Property.find(filter)
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * limit)
        .limit(limit),
      Property.countDocuments(filter),
      Property.aggregate([
        ...(isStaff ? [] : [{ $match: { visibility: "public" } }]),
        {
          $facet: {
            total: [{ $count: "count" }],
            builds: [{ $match: { category: "build" } }, { $count: "count" }],
            apartments: [{ $match: { category: "apartment" } }, { $count: "count" }],
            lands: [{ $match: { category: "land" } }, { $count: "count" }],
            forSale: [{ $match: { listingType: "sale" } }, { $count: "count" }],
            forRent: [{ $match: { listingType: "rent" } }, { $count: "count" }],
            available: [{ $match: { status: "available" } }, { $count: "count" }],
            sold: [{ $match: { status: "sold" } }, { $count: "count" }],
            rented: [{ $match: { status: "rented" } }, { $count: "count" }],
          },
        },
      ]),
    ]);

    const pick = (arr: Array<{ count: number }>) => arr?.[0]?.count ?? 0;
    const facet = statsAgg[0] ?? {};

    const body: PropertyListResponse = {
      data: docs.map(doc => serializeProperty(doc, isStaff)),
      total,
      stats: {
        total: pick(facet.total),
        builds: pick(facet.builds),
        apartments: pick(facet.apartments),
        lands: pick(facet.lands),
        forSale: pick(facet.forSale),
        forRent: pick(facet.forRent),
        available: pick(facet.available),
        sold: pick(facet.sold),
        rented: pick(facet.rented),
      },
    };

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error("GET /api/properties failed:", err);
    return NextResponse.json(
      { error: "Failed to load listings. Please try again." },
      { status: 500 }
    );
  }
}

// POST /api/properties
export async function POST(req: NextRequest) {
  const { session, response: authError } = await requireListingsAccess();
  if (authError) return authError;

  try {
    await connectToDatabase();

    const json = await req.json();
    const parsed = propertyInputSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          fieldErrors: flattenZodErrors(parsed.error),
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (isBuildOnlyRole(session!.user.role) && data.category !== "build") {
      return NextResponse.json(
        { error: "Project managers can only create build listings." },
        { status: 403 }
      );
    }

    // Belt-and-suspenders: strip rentalPeriod for land/sale, and units for
    // non-build categories, even if it slipped through client-side.
    const selectedUser = data.broughtByUserId ? await User.findById(data.broughtByUserId).select("name active") : null;
    if (data.broughtByUserId && !selectedUser) {
      return NextResponse.json({ error: "Choose an existing system user.", fieldErrors: { broughtByUserId: "User no longer exists." } }, { status: 400 });
    }
    const payload = {
      ...data,
      propertyType: data.category === "apartment" ? data.propertyType : undefined,
      broughtBy: selectedUser ? { userId: selectedUser._id.toString(), name: selectedUser.name } : undefined,
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

    const created = await Property.create(payload);
    return NextResponse.json(
      { data: serializeProperty(created, true) },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/properties failed:", err);
    if (err instanceof Error && err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create listing. Please try again." },
      { status: 500 }
    );
  }
}
