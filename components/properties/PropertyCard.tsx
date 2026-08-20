"use client";

import Link from "next/link";
import type { PropertyDTO } from "@/types/property";
import { CategoryBadge } from "./CategoryBadge";
import { ListingTypeBadge } from "./ListingTypeBadge";
import { StatusBadge } from "./StatusBadge";
import { formatLocation, formatPriceWithPeriod } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function PropertyCard({ property }: { property: PropertyDTO }) {
  const { t } = useLanguage();
  const image = property.images[0];
  const isUnavailable = property.status !== "available";

  return (
    <Link
      href={`/properties/${property._id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-ink-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-200">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={property.title}
            className={[
              "h-full w-full object-cover transition duration-300 group-hover:scale-105",
              isUnavailable ? "grayscale-[40%] opacity-70" : "",
            ].join(" ")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-300">
            <span className="font-display text-sm italic">{t("property.noImage")}</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <CategoryBadge category={property.category} />
          <StatusBadge status={property.status} />
        </div>
        <div className="absolute right-3 top-3">
          <ListingTypeBadge listingType={property.listingType} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-display text-lg font-semibold text-ink-800">
          {property.title}
        </h3>
        <p className="line-clamp-1 text-sm text-ink-400">
          {formatLocation(property.location, t)}
        </p>
        {property.details && (property.details.rooms != null || property.details.bathrooms != null) && (
          <p className="text-xs font-medium text-ink-400">
            {property.details.rooms != null && `${t("property.rooms")}: ${property.details.rooms}`}
            {property.details.rooms != null && property.details.bathrooms != null && " · "}
            {property.details.bathrooms != null && `${t("property.bathrooms")}: ${property.details.bathrooms}`}
          </p>
        )}
        <p className="line-clamp-2 text-sm text-ink-500">
          {property.description}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-display text-lg font-semibold text-ink-800">
            {formatPriceWithPeriod(property.price, property.listingType, property.rentalPeriod, t)}
          </span>
          {property.owner?.name && (
            <span className="text-xs font-medium text-ink-400">
              {property.owner.name}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
