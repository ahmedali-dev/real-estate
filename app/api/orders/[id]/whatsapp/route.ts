import { resolvedWhatsAppConfig } from "@/lib/whatsapp-settings";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireOrdersAccess } from "@/lib/auth/requireSession";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Order } from "@/models/Order";
import { serializeOrder } from "@/lib/mongodb/serializeOrder";
import { orderWhatsAppMessage } from "@/lib/order-message";
import { fetchWhatsAppGroups } from "@/lib/openwa-groups";
import { sendOpenwa, OpenwaSendError } from "@/lib/openwa";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireOrdersAccess();
  if (response) return response;
  if (req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({ code: "sendFailed" }, { status: 403 });
  const config = await resolvedWhatsAppConfig();
  if (!config) return NextResponse.json({ code: "openwaSetup" }, { status: 503 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ code: "invalidRecipient" }, { status: 400 }); }
  if (!mongoose.Types.ObjectId.isValid((await params).id) || typeof body.groupId !== "string" || !/^\d+(?:-\d+)?@g\.us$/.test(body.groupId) || !["en", "ar"].includes(body.locale)) return NextResponse.json({ code: "invalidRecipient" }, { status: 400 });
  try {
    const groups = await fetchWhatsAppGroups(config);
    if (!groups.some(group => group.id === body.groupId)) return NextResponse.json({ code: "invalidRecipient" }, { status: 400 });
    await connectToDatabase();
    const order = await Order.findById((await params).id);
    if (!order) return NextResponse.json({ code: "sendFailed" }, { status: 404 });
    await sendOpenwa(config, body.groupId, orderWhatsAppMessage(serializeOrder(order), body.locale));
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ code: error instanceof OpenwaSendError ? error.code : "sendFailed" }, { status: 502 }); }
}
