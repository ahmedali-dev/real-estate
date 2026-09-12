import type { Metadata } from "next";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Property } from "@/models/Property";
import { serializeProperty } from "@/lib/mongodb/serialize";
import PropertyDetailsClient from "./PropertyDetailsClient";

const FALLBACK_METADATA: Metadata = {
  title: "Listing | Maskan",
  description: "Browse builds, apartments, and land for sale or rent.",
};

/**
 * Generates per-listing Open Graph / Twitter Card metadata so that sharing
 * a listing's URL — most notably via WhatsApp — shows a rich preview
 * (cover image, title, description) directly in the chat, without the
 * recipient needing to open the link first.
 *
 * This has to live in a server component (metadata can't be generated from
 * a "use client" page), which is why this file exists as a thin wrapper
 * around PropertyDetailsClient.tsx, which still holds all the actual
 * interactive page logic unchanged.
 *
 * Respects the same privacy rule as the API and the page itself: a private
 * listing with no signed-in session returns generic fallback metadata, so
 * its title/image/description never leak through a shared link preview.
 */
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  if (!mongoose.Types.ObjectId.isValid(params.id)) {
    return FALLBACK_METADATA;
  }

  try {
    await connectToDatabase();
    const doc = await Property.findById(params.id);
    if (!doc) return FALLBACK_METADATA;

    if (doc.visibility === "private") {
      const session = await getServerSession(authOptions);
      if (!session?.user) return FALLBACK_METADATA;
    }

    const property = serializeProperty(doc);
    const description =
      property.description.length > 160
        ? `${property.description.slice(0, 157)}...`
        : property.description;
    const image = property.images[0];

    return {
      title: `${property.title} | Maskan`,
      description,
      openGraph: {
        title: property.title,
        description,
        type: "website",
        images: image ? [{ url: image }] : undefined,
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title: property.title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch (err) {
    console.error("generateMetadata for property failed:", err);
    return FALLBACK_METADATA;
  }
}

export default function PropertyDetailsPage() {
  return <PropertyDetailsClient />;
}
