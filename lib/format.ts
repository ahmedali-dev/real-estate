export function formatPrice(price: number, locale: "en" | "ar" = "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatPriceWithPeriod(
  price: number,
  listingType: "sale" | "rent",
  rentalPeriod?: "monthly" | "yearly",
  t?: (path: string) => string
): string {
  const sar = t ? t("common.sar") : "SAR";
  const monthly = t ? t("form.monthly") : "mo";
  const yearly = t ? t("form.yearly") : "yr";
  const base = `${formatPrice(price)} ${sar}`;
  if (listingType === "rent" && rentalPeriod) {
    return `${base} / ${rentalPeriod === "monthly" ? monthly : yearly}`;
  }
  return base;
}

export function formatDate(iso: string, locale: "en" | "ar" = "en"): string {
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatLocation(
  location: { address?: string; city: string; district?: string } | undefined,
  t?: (path: string) => string
): string {
  if (!location) return t ? t("property.locationNotSpecified") : "Location not specified";
  const parts = [location.district, location.city].filter(Boolean).join(", ");
  return parts || (t ? t("property.locationNotSpecified") : "Location not specified");
}
