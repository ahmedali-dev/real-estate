import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireListingsAccess } from "@/lib/auth/requireSession";

export const dynamic = "force-dynamic";

// The Cloudinary Node SDK auto-configures cloud_name/api_key/api_secret
// from the CLOUDINARY_URL env var the moment this module loads. We only
// need to force secure (https) URLs explicitly.
cloudinary.config({ secure: true });

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// POST /api/uploads — multipart/form-data with a single "file" field.
// Used by the listing form's image picker (upload from device, instead of
// pasting an external URL).
export async function POST(req: NextRequest) {
  const { response: authError } = await requireListingsAccess();
  if (authError) return authError;

  if (!process.env.CLOUDINARY_URL) {
    return NextResponse.json(
      { error: "Image uploads aren't configured on this server (missing CLOUDINARY_URL)." },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WEBP, or GIF images are allowed." },
        { status: 400 }
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 8MB)." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: "maskan/listings",
      resource_type: "image",
    });

    return NextResponse.json({ data: { url: result.secure_url } }, { status: 201 });
  } catch (err) {
    console.error("POST /api/uploads failed:", err);
    return NextResponse.json({ error: "Failed to upload image. Please try again." }, { status: 500 });
  }
}
