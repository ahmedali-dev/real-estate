import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { Property } from "@/models/Property";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { readVideo, completedVideoReference, videoBackend } from "@/lib/local-video";
import { resolvedVideoUploadConfig } from "@/lib/video-upload-settings";
import { forwardedVideoHeaders } from "@/lib/video-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  let claim: Record<string, unknown>;
  try { claim = readVideo((await params).token); } catch { return new NextResponse(null, { status: 404 }); }
  if (claim.kind !== "property-video-share" || typeof claim.propertyId !== "string" || !mongoose.Types.ObjectId.isValid(claim.propertyId) || typeof claim.expires !== "number" || claim.expires < Date.now()) return new NextResponse(null, { status: 404 });
  try {
    const config = await resolvedVideoUploadConfig(request.url);
    if (!config || claim.backend !== videoBackend(config)) return new NextResponse(null, { status: 404 });
    await connectToDatabase();
    const property = await Property.findById(claim.propertyId).select("visibility localVideo");
    if (!property || property.visibility !== "public" || !property.localVideo) return new NextResponse(null, { status: 404 });
    const reference = completedVideoReference(property.localVideo);
    if (!reference || reference.backend !== videoBackend(config) || reference.uploadId !== claim.uploadId) return new NextResponse(null, { status: 404 });
    const result = await fetch(`${config.url}/videos/${reference.uploadId}/download?disposition=inline`, {
      headers: { "X-API-Key": config.key, "ngrok-skip-browser-warning": "1", ...(request.headers.get("range") ? { Range: request.headers.get("range")! } : {}) },
      cache: "no-store", redirect: "error", signal: request.signal,
    });
    if (result.status === 404 || result.status === 410) return new NextResponse(null, { status: result.status });
    if (![200, 206, 416].includes(result.status)) return new NextResponse(null, { status: 502 });
    return new NextResponse(result.body, { status: result.status, headers: forwardedVideoHeaders(result, "inline", reference.filename) });
  } catch { return new NextResponse(null, { status: 502 }); }
}
