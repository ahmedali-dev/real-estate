"use client";

import type { ListingType, RentalPeriod } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatPrice } from "@/lib/format";

export function PriceDisplay({ price, listingType, rentalPeriod, large = false }: { price?: number; listingType: ListingType; rentalPeriod?: RentalPeriod; large?: boolean }) {
  const { t, locale } = useLanguage();
  if (price == null) return <span className="text-base font-semibold text-ink-600">{t("property.priceOnRequest")}</span>;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <bdi dir="ltr" className={`estate-price font-mono font-medium tracking-tight text-brass-600 tabular-nums ${large ? "text-3xl sm:text-4xl" : "text-xl"}`}>{formatPrice(price, locale)}</bdi>
      <span className="text-xs font-semibold text-ink-500">{t("common.sar")}</span>
      {listingType === "rent" && rentalPeriod && <span className="text-xs font-medium text-ink-400">/ {t(rentalPeriod === "monthly" ? "form.monthly" : "form.yearly")}</span>}
    </span>
  );
}
