import { resolvedWhatsAppConfig } from "@/lib/whatsapp-settings";
import { whatsappRecipient } from "@/lib/property-share";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireListingsAccess, isBuildOnlyRole } from "@/lib/auth/requireSession";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Property } from "@/models/Property";
import { serializeProperty } from "@/lib/mongodb/serialize";
import { configuredPublicSiteOrigin } from "@/lib/site-url";
import { sendPropertyOpenwa, sendPropertyVideoOpenwa, OpenwaSendError } from "@/lib/openwa";
import { resolvedVideoUploadConfig } from "@/lib/video-upload-settings";
import { completedVideoReference, signVideo, videoBackend } from "@/lib/local-video";
import { getVideoMetadata, WHATSAPP_VIDEO_MAX_BYTES } from "@/lib/video-delivery";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireListingsAccess();
  if (response) return response;
  if (req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({ error: "Forbidden", code: "sendFailed" }, { status: 403 });
  const config = await resolvedWhatsAppConfig();
  const origin = config && "siteUrl" in config ? config.siteUrl : configuredPublicSiteOrigin();
  if (!config || !origin) return NextResponse.json({ code: "openwaSetup" }, { status: 503 });
  if (!mongoose.Types.ObjectId.isValid((await params).id)) return NextResponse.json({ code: "sendFailed" }, { status: 400 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ code: "invalidRecipient" }, { status: 400 }); }
  const to = typeof body?.phone === "string" ? whatsappRecipient(body.phone) : null;
  if (!to || !["en", "ar"].includes(body?.locale)) return NextResponse.json({ code: "invalidRecipient" }, { status: 400 });
  try {
    await connectToDatabase();
    const doc = await Property.findById((await params).id);
    if (!doc) return NextResponse.json({ code: "sendFailed" }, { status: 404 });
    if (isBuildOnlyRole(session!.user.role) && doc.category !== "build") return NextResponse.json({ code: "sendFailed" }, { status: 403 });
    if (doc.visibility === "private") return NextResponse.json({ code: "privateShare" }, { status: 400 });
    if (body?.includeVideo === true) {
      const reference = typeof doc.localVideo === "string" ? completedVideoReference(doc.localVideo) : null;
      const videoConfig = await resolvedVideoUploadConfig(req.url);
      if (!reference || !videoConfig || reference.backend !== videoBackend(videoConfig)) return NextResponse.json({ code: "videoUnavailable" }, { status: 409 });
      const metadata = await getVideoMetadata(videoConfig, reference.uploadId);
      if (!metadata) return NextResponse.json({ code: "videoUnavailable" }, { status: 502 });
      if (metadata.size > WHATSAPP_VIDEO_MAX_BYTES) return NextResponse.json({ code: "videoTooLarge" }, { status: 413 });
      const token = signVideo({ kind: "property-video-share", propertyId: doc._id.toString(), uploadId: reference.uploadId, backend: reference.backend, expires: Date.now() + 15 * 60 * 1000 });
      const videoUrl = `${origin}/api/property-video/${token}`;
      await sendPropertyVideoOpenwa(config, to, serializeProperty(doc), origin, body.locale, videoUrl, metadata.filename);
    } else {
      await sendPropertyOpenwa(config, to, serializeProperty(doc), origin, body.locale);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    // Never expose provider responses, credentials or recipient numbers.
    return NextResponse.json({ code: error instanceof OpenwaSendError ? error.code : "sendFailed" }, { status: 502 });
  }
}
