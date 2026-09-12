import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Order } from "@/models/Order";
import { serializeOrder } from "@/lib/mongodb/serializeOrder";
import { orderInputSchema, flattenZodErrors } from "@/lib/validations/order";
import type { OrderListResponse } from "@/types/order";
import { requireOrdersAccess } from "@/lib/auth/requireSession";

export const dynamic = "force-dynamic";

// GET /api/orders?status=&category=&search=&page=&limit=
export async function GET(req: NextRequest) {
  const { response: authError } = await requireOrdersAccess();
  if (authError) return authError;

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));

    const filter: Record<string, unknown> = {};
    if (status && ["pending", "contacted", "fulfilled", "cancelled"].includes(status)) {
      filter.status = status;
    }
    if (category && ["apartment", "build", "land"].includes(category)) {
      filter.requestedCategory = category;
    }
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
      ];
    }

    const [docs, total, statsAgg] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(filter),
      Order.aggregate([
        {
          $facet: {
            total: [{ $count: "count" }],
            pending: [{ $match: { status: "pending" } }, { $count: "count" }],
            contacted: [{ $match: { status: "contacted" } }, { $count: "count" }],
            fulfilled: [{ $match: { status: "fulfilled" } }, { $count: "count" }],
            cancelled: [{ $match: { status: "cancelled" } }, { $count: "count" }],
          },
        },
      ]),
    ]);

    const pick = (arr: Array<{ count: number }>) => arr?.[0]?.count ?? 0;
    const facet = statsAgg[0] ?? {};

    const body: OrderListResponse = {
      data: docs.map(serializeOrder),
      total,
      stats: {
        total: pick(facet.total),
        pending: pick(facet.pending),
        contacted: pick(facet.contacted),
        fulfilled: pick(facet.fulfilled),
        cancelled: pick(facet.cancelled),
      },
    };

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error("GET /api/orders failed:", err);
    return NextResponse.json(
      { error: "Failed to load orders. Please try again." },
      { status: 500 }
    );
  }
}

// POST /api/orders
export async function POST(req: NextRequest) {
  const { session, response: authError } = await requireOrdersAccess();
  if (authError) return authError;

  try {
    await connectToDatabase();

    const json = await req.json();
    const parsed = orderInputSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: flattenZodErrors(parsed.error) },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const payload = {
      ...data,
      requestedListingType: data.requestedCategory === "land" ? "sale" : data.requestedListingType,
      notes: data.notes || undefined,
      loggedBy: session ? { userId: session.user.id, name: session.user.name ?? session.user.email ?? "" } : undefined,
    };

    const created = await Order.create(payload);
    return NextResponse.json({ data: serializeOrder(created) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/orders failed:", err);
    return NextResponse.json(
      { error: "Failed to create order. Please try again." },
      { status: 500 }
    );
  }
}
