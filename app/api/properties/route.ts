import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Property } from "@/models/Property";
import { serializeProperty } from "@/lib/mongodb/serialize";
import { propertyInputSchema, flattenZodErrors } from "@/lib/validations/property";
import type { PropertyListResponse } from "@/types/property";

export const dynamic = "force-dynamic";

// GET /api/properties?category=&listingType=&search=&sortBy=&sortDir=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const listingType = searchParams.get("listingType");
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();
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
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { "location.city": { $regex: search, $options: "i" } },
        { "location.district": { $regex: search, $options: "i" } },
        { "location.address": { $regex: search, $options: "i" } },
      ];
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
      data: docs.map(serializeProperty),
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

    // Belt-and-suspenders: strip rentalPeriod for land/sale, and units for
    // non-build categories, even if it slipped through client-side.
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

    const created = await Property.create(payload);
    return NextResponse.json(
      { data: serializeProperty(created) },
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
