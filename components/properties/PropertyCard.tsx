"use client";

import { useState } from "react";
import { PropertyQuickView } from "./PropertyQuickView";
import { Icon } from "@/components/ui/Icon";
import { PriceDisplay } from "./PriceDisplay";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { PropertyDTO, ResidencyType } from "@/types/property";
import { CategoryBadge } from "./CategoryBadge";
import { ListingTypeBadge } from "./ListingTypeBadge";
import { StatusBadge } from "./StatusBadge";
import { ResidencyBadge } from "./ResidencyBadge";
import { formatLocation } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function PropertyCard({ property }: { property: PropertyDTO }) {
  const { t, locale } = useLanguage();
  const [quickOpen, setQuickOpen] = useState(false);
  const { data: session } = useSession();
  const image = property.images[0];
  const isUnavailable = property.status !== "available";

  // An apartment carries its own residency classification; a build carries
  // it per unit instead (different floors/units can differ), so show every
  // distinct type present across its units.
  const residencyTypes: ResidencyType[] = property.details?.residencyType
    ? [property.details.residencyType]
    : Array.from(
        new Set((property.units ?? []).map((u) => u.residencyType).filter((r): r is ResidencyType => Boolean(r)))
      );

  return (
    <article className="haven-card">
    <Link
      href={`/properties/${property._id}`}
      className="group haven-card-link"
    >
      <div className="haven-card-image relative w-full overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            loading="lazy"
            decoding="async"
            alt={property.title}
            className={[
              "h-full w-full object-cover transition duration-300 group-hover:scale-105",
              isUnavailable ? "grayscale-[40%] opacity-70" : "",
            ].join(" ")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-300">
            <span className="flex flex-col items-center gap-3"><Icon name="image" className="h-10 w-10" /><span className="text-xs font-medium">{t("property.noImage")}</span></span>
          </div>
        )}
        <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
          <CategoryBadge category={property.category} propertyType={property.propertyType} />
          <StatusBadge status={property.status} />
        </div>
        {property.images.length > 0 && <span className="estate-photo-count"><Icon name="image" className="h-3.5 w-3.5" />{property.images.length}</span>}
        <div className="absolute end-3 top-3">
          <ListingTypeBadge listingType={property.listingType} />
        </div>
      </div>

      <div className="haven-card-body">
        <p className="flex items-center gap-1.5 text-xs text-ink-500">
          <Icon name="location" className="h-4 w-4" /><span className="truncate">{formatLocation(property.location, t)}</span>
        </p>
        <h3 className="haven-card-title">{property.title}</h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-ink-500">{property.description}</p>
        {property.category !== "land" && property.details && (property.details.rooms != null || property.details.bathrooms != null || property.details.acInstalled) && (
          <div className="flex flex-wrap gap-2 py-1 text-xs font-medium text-ink-600">
            {property.details.rooms != null && <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-50 px-2.5 py-1.5"><Icon name="bed" className="h-4 w-4" />{property.details.rooms} {t("property.rooms")}</span>}
            {property.details.bathrooms != null && <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-50 px-2.5 py-1.5"><Icon name="bath" className="h-4 w-4" />{property.details.bathrooms} {t("property.bathrooms")}</span>}
            {property.details.acInstalled && <span className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-2.5 py-1.5 text-moss-600"><Icon name="snow" className="h-4 w-4" />{t("form.acInstalled")}</span>}
          </div>
        )}
        {session?.user && residencyTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {residencyTypes.map((rt) => (
              <ResidencyBadge key={rt} residencyType={rt} size="sm" />
            ))}
          </div>
        )}
        {property.category === "build" && property.units.length > 0 && <p className="text-xs text-ink-500">{property.units.length} {t("property.unitsSection")}</p>}
        {session?.user && property.owner?.name && <p className="truncate text-xs text-ink-500">{property.owner.name}</p>}
      </div>
    </Link>
    <div className="haven-card-footer">
      <PriceDisplay price={property.price} listingType={property.listingType} rentalPeriod={property.rentalPeriod} />

    </div>
    <div className="estate-card-actions"><Link href={`/properties/${property._id}`} className="btn-primary">{locale === "ar" ? "عرض التفاصيل" : "View details"}</Link><button type="button" onClick={() => setQuickOpen(true)} className="btn-secondary" aria-label={`${t("property.quickView")}: ${property.title}`}><Icon name="search" className="h-4 w-4" /><span>{t("property.quickView")}</span></button></div>
    {quickOpen && <PropertyQuickView property={property} onClose={() => setQuickOpen(false)} />}
    </article>
  );
}
