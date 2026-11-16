import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { requireListingsAccess, isBuildOnlyRole } from "@/lib/auth/requireSession";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Property } from "@/models/Property";
import { resolvedVideoUploadConfig } from "@/lib/video-upload-settings";
import { completedVideoReference, videoBackend } from "@/lib/local-video";
import { forwardedVideoHeaders } from "@/lib/video-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireListingsAccess();
  if (response) return response;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Property not found." }, { status: 404 });
  try {
    await connectToDatabase();
    const property = await Property.findById(id).select("category localVideo");
    if (!property || (isBuildOnlyRole(session!.user.role) && property.category !== "build")) return NextResponse.json({ error: "Property not found." }, { status: 404 });
    if (!property.localVideo) return NextResponse.json({ error: "No uploaded video is attached to this property." }, { status: 404 });
    const reference = completedVideoReference(property.localVideo);
    if (!reference) return NextResponse.json({ error: "This video reference is outdated. Upload the video again to enable download." }, { status: 410 });
    const config = await resolvedVideoUploadConfig(request.url);
    if (!config || reference.backend !== videoBackend(config)) return NextResponse.json({ error: "Video upload service is unavailable for this site." }, { status: 503 });
    const disposition = request.nextUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment";
    const range = request.headers.get("range");
    const result = await fetch(`${config.url}/videos/${reference.uploadId}/download?disposition=${disposition}`, {
      headers: { "X-API-Key": config.key, "ngrok-skip-browser-warning": "1", ...(range ? { Range: range } : {}), ...(request.headers.get("if-range") ? { "If-Range": request.headers.get("if-range")! } : {}) },
      cache: "no-store", redirect: "error", signal: request.signal,
    });
    if (result.status === 404 || result.status === 410) return NextResponse.json({ error: "Uploaded video is no longer available." }, { status: result.status, headers: { "Cache-Control": "private, no-store" } });
    if (![200, 206, 416].includes(result.status)) return NextResponse.json({ error: "Could not retrieve the uploaded video." }, { status: 502 });
    return new NextResponse(result.body, { status: result.status, headers: forwardedVideoHeaders(result, disposition, reference.filename) });
  } catch {
    return NextResponse.json({ error: "Video server unavailable." }, { status: 502 });
  }
}
