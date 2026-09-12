"use client";

import type { ListingType } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function ListingTypeBadge({
  listingType,
  size = "md",
}: {
  listingType: ListingType;
  size?: "sm" | "md";
}) {
  const { t } = useLanguage();
  const isSale = listingType === "sale";
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider",
        sizeClasses,
        isSale
          ? "bg-brass-100 text-brass-600"
          : "bg-moss-100 text-moss-600",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          isSale ? "bg-brass-500" : "bg-moss-500",
        ].join(" ")}
      />
      {t(`badges.listingType.${listingType}`)}
    </span>
  );
}
