import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireListingsAccess } from "@/lib/auth/requireSession";

export const dynamic = "force-dynamic";

const TIKTOK_URL_PATTERN = /^https?:\/\/([\w-]+\.)?tiktok\.com\/|^https?:\/\/vm\.tiktok\.com\//i;

// The Cloudinary Node SDK auto-configures cloud_name/api_key/api_secret
// from the CLOUDINARY_URL env var the moment this module loads.
cloudinary.config({ secure: true });

interface TikTokOEmbedResponse {
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  title?: string;
  author_name?: string;
  html?: string;
}

/**
 * GET /api/tiktok/oembed?url=<tiktok video url>
 *
 * TikTok doesn't offer a supported way to download a video and pull a frame
 * out of it — that would mean scraping their CDN, which is against their
 * terms of service and isn't something this app does. Instead, this calls
 * TikTok's public oEmbed endpoint (the same mechanism used for legitimate
 * embeds), which returns the video's own official cover thumbnail.
 *
 * That thumbnail_url is itself a signed, time-limited CDN link — TikTok's
 * signature on it expires after a few days, so it can't be stored as-is or
 * a listing saved today would show a broken cover image later with no way
 * to notice until a visitor sees it. Instead, Cloudinary is handed that URL
 * directly and fetches + re-hosts the image on its own permanent URL, which
 * is what actually gets stored on the listing.
 */
export async function GET(req: NextRequest) {
  const { response: authError } = await requireListingsAccess();
  if (authError) return authError;

  const url = req.nextUrl.searchParams.get("url")?.trim();

  if (!url) {
    return NextResponse.json({ error: "Missing 'url' query parameter." }, { status: 400 });
  }

  if (!TIKTOK_URL_PATTERN.test(url)) {
    return NextResponse.json({ error: "That doesn't look like a TikTok video URL." }, { status: 400 });
  }

  if (!process.env.CLOUDINARY_URL) {
    return NextResponse.json(
      { error: "Cover fetching isn't configured on this server (missing CLOUDINARY_URL)." },
      { status: 500 }
    );
  }

  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(oembedUrl, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            res.status === 404
              ? "TikTok couldn't find that video. Check the link and make sure the video is public."
              : "TikTok didn't return a preview for that video.",
        },
        { status: 502 }
      );
    }

    const data = (await res.json()) as TikTokOEmbedResponse;

    if (!data.thumbnail_url) {
      return NextResponse.json(
        { error: "TikTok didn't provide a cover image for that video." },
        { status: 502 }
      );
    }

    let thumbnailUrl: string;
    try {
      const uploaded = await cloudinary.uploader.upload(data.thumbnail_url, {
        folder: "maskan/tiktok-covers",
        resource_type: "image",
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
      { error: "Couldn't reach TikTok to fetch the cover image. Please try again." },
      { status: 502 }
    );
  }
}
