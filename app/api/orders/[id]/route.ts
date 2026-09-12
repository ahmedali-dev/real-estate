import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Order } from "@/models/Order";
import { serializeOrder } from "@/lib/mongodb/serializeOrder";
import { orderInputSchema, flattenZodErrors } from "@/lib/validations/order";
import { requireOrdersAccess, requireAdmin } from "@/lib/auth/requireSession";

export const dynamic = "force-dynamic";

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

// GET /api/orders/:id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { response: authError } = await requireOrdersAccess();
  if (authError) return authError;

  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
    }
    await connectToDatabase();

    const doc = await Order.findById(params.id);
    if (!doc) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ data: serializeOrder(doc) }, { status: 200 });
  } catch (err) {
    console.error(`GET /api/orders/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to load order." }, { status: 500 });
  }
}

// PUT /api/orders/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { response: authError } = await requireOrdersAccess();
  if (authError) return authError;

  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
    }
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
    };

    const updated = await Order.findByIdAndUpdate(
      params.id,
      {
        $set: payload,
        $unset: payload.requestedListingType ? {} : { requestedListingType: "" },
      },
      { new: true, runValidators: true, context: "query" }
    );

    if (!updated) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ data: serializeOrder(updated) }, { status: 200 });
  } catch (err) {
    console.error(`PUT /api/orders/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
  }
}

// DELETE /api/orders/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
    }
    await connectToDatabase();

    const deleted = await Order.findByIdAndDelete(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ data: { _id: params.id } }, { status: 200 });
  } catch (err) {
    console.error(`DELETE /api/orders/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete order." }, { status: 500 });
  }
}
