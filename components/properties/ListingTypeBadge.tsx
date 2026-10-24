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
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={[
        "estate-listing-badge inline-flex items-center gap-1.5 rounded-full font-semibold",
        sizeClasses,
        "bg-[#F8E4D8] text-[#7A2D14]",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          "bg-current",
        ].join(" ")}
      />
      {t(`badges.listingType.${listingType}`)}
    </span>
  );
}
