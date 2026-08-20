import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TIKTOK_URL_PATTERN = /^https?:\/\/([\w-]+\.)?tiktok\.com\/|^https?:\/\/vm\.tiktok\.com\//i;

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
 * embeds), which returns the video's own official cover thumbnail. That
 * image is what gets offered as the listing's cover photo.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")?.trim();

  if (!url) {
    return NextResponse.json({ error: "Missing 'url' query parameter." }, { status: 400 });
  }

  if (!TIKTOK_URL_PATTERN.test(url)) {
    return NextResponse.json({ error: "That doesn't look like a TikTok video URL." }, { status: 400 });
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

    return NextResponse.json(
      {
        data: {
          thumbnailUrl: data.thumbnail_url,
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
