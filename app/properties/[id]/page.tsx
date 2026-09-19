import type { Metadata } from "next";
import mongoose from "mongoose";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Property } from "@/models/Property";
import { serializeProperty } from "@/lib/mongodb/serialize";
import type { PropertyDTO } from "@/types/property";
import PropertyDetailsClient from "./PropertyDetailsClient";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

const FALLBACK_METADATA: Metadata = {
  title: "Listing",
  description: "Browse builds, apartments, and land for sale or rent.",
};

/**
 * Fetches a listing and enforces the same visibility rule used everywhere
 * else: a private listing is treated as if it doesn't exist unless the
 * requester is signed in. Wrapped in React's cache() so generateMetadata
 * and the page component below both call this with the same id in the
 * same request without hitting the database twice.
 */
const getVisibleProperty = cache(async (id: string): Promise<PropertyDTO | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  await connectToDatabase();
  const doc = await Property.findById(id);
  if (!doc) return null;

  if (doc.visibility === "private") {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
  }

  return serializeProperty(doc);
});

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
  try {
    const property = await getVisibleProperty(params.id);
    if (!property) return FALLBACK_METADATA;

    const description =
      property.description.length > 160
        ? `${property.description.slice(0, 157)}...`
        : property.description;
    const image = property.images[0];

    return {
      // Root layout's title template appends "| Maskan" automatically.
      title: property.title,
      description,
      alternates: { canonical: `/properties/${property._id}` },
      openGraph: {
        title: property.title,
        description,
        url: `${baseUrl}/properties/${property._id}`,
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

export default async function PropertyDetailsPage({ params }: { params: { id: string } }) {
  const property = await getVisibleProperty(params.id).catch(() => null);

  // Structured data (schema.org) for search engines — omitted entirely for
  // a not-found/private listing, same as the metadata above, so nothing
  // about it is described in markup either.
  const jsonLd = property
    ? {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        name: property.title,
        description: property.description,
        url: `${baseUrl}/properties/${property._id}`,
        image: property.images.length > 0 ? property.images : undefined,
        datePosted: property.createdAt,
        offers: {
          "@type": "Offer",
          price: property.price,
          priceCurrency: "SAR",
          availability:
            property.status === "available"
              ? "https://schema.org/InStock"
              : "https://schema.org/SoldOut",
        },
        ...(property.location
          ? {
              address: {
                "@type": "PostalAddress",
                streetAddress: property.location.address,
                addressLocality: property.location.city,
                addressRegion: property.location.district,
                addressCountry: "SA",
              },
            }
          : {}),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PropertyDetailsClient />
    </>
  );
}
