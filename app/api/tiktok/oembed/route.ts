import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getTikTokCover } from "@/lib/tiktok-cover";
import { tiktokUrl } from "@/lib/tiktok-lookup";
import { requireListingsAccess } from "@/lib/auth/requireSession";

export const dynamic = "force-dynamic";

// The Cloudinary Node SDK auto-configures cloud_name/api_key/api_secret
// from the CLOUDINARY_URL env var the moment this module loads.
cloudinary.config({ secure: true });

export async function GET(req: NextRequest) {
  const { response: authError } = await requireListingsAccess();
  if (authError) return authError;

  const url = req.nextUrl.searchParams.get("url")?.trim();

  if (!url) {
    return NextResponse.json({ error: "Missing 'url' query parameter." }, { status: 400 });
  }

  if (!tiktokUrl(url)) {
    return NextResponse.json({ error: "That doesn't look like a TikTok video URL." }, { status: 400 });
  }

  if (!process.env.CLOUDINARY_URL) {
    return NextResponse.json(
      { error: "Cover fetching isn't configured on this server (missing CLOUDINARY_URL)." },
      { status: 500 }
    );
  }

  try {
    const data = await getTikTokCover(url);

    let thumbnailUrl: string;
    try {
      const uploaded = await cloudinary.uploader.upload(data.thumbnail_url!, {
        folder: "maskan/tiktok-covers",
        resource_type: "image",
        timeout: 20000,
      });
      thumbnailUrl = uploaded.secure_url;
    } catch (err) {
      console.error("Failed to upload TikTok cover image to Cloudinary:", err);
      return NextResponse.json(
        { error: "Couldn't save the cover image. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        data: {
          thumbnailUrl,
          title: data.title,
          authorName: data.author_name,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/tiktok/oembed failed:", err);
    return NextResponse.json(
      { error: err instanceof Error && (err.message.startsWith("TikTok") || err.message.startsWith("Enter a valid")) ? err.message : "Couldn't reach TikTok to fetch the cover image. Please try again or upload a cover from your device." },
      { status: 502 }
    );
  }
}
