import type { PropertyDTO } from "@/types/property";
import { propertyLocationUrl } from "./property-share";
import { formatPriceWithPeriod } from "./format";
import { translations } from "./i18n/translations";

/** Both preview and server sending use this exact message. Stored text stays in its original language. */
export function propertyTextMessage(property: PropertyDTO, origin: string, locale: "en" | "ar") {
  const words = translations[locale];
  const labels: Record<string, string> = {
    "common.sar": words.common.sar, "property.priceOnRequest": words.property.priceOnRequest,
    "form.monthly": words.form.monthly, "form.yearly": words.form.yearly,
  };
  const price = formatPriceWithPeriod(property.price, property.listingType, property.rentalPeriod, (key) => labels[key] || key, locale);
  const location = propertyLocationUrl(property);
  const d = property.details;
  const details = [d?.rooms != null ? `${words.property.rooms}: ${d.rooms}` : "", d?.bathrooms != null ? `${words.property.bathrooms}: ${d.bathrooms}` : ""].filter(Boolean).join(" • ");
  const features = [
    d?.hasKitchen != null ? `${words.property.kitchen}: ${d.hasKitchen ? words.property.hasKitchenYes : words.property.hasKitchenNo}` : "",
    d?.kitchenCabinetsInstalled != null ? `${words.property.kitchenCabinetsInstalled}: ${d.kitchenCabinetsInstalled ? words.property.hasKitchenYes : words.property.hasKitchenNo}` : "",
    d?.acInstalled != null ? `${words.form.acInstalled}: ${d.acInstalled ? words.property.hasKitchenYes : words.property.hasKitchenNo}` : "",
  ].filter(Boolean);
  const units = property.category === "build" && property.units.length ? ["", `*${words.property.unitsSection}*`, ...property.units.map((unit, index) => `${unit.name || unit.number || `${words.property.unit} ${index + 1}`} • ${unit.isRented ? words.badges.status.rented : words.badges.status.available}${unit.rooms != null ? ` • ${words.property.rooms}: ${unit.rooms}` : ""}${unit.bathrooms != null ? ` • ${words.property.bathrooms}: ${unit.bathrooms}` : ""}`)] : [];
  const address = [property.location?.address, property.location?.district, property.location?.city].filter(Boolean).join(", ");
  return ["*41 للعقارات | 41 Real Estate*", "", `*${property.title}*`,
    `${(property.propertyType ? words.offer.types[property.propertyType] : words.badges.category[property.category])} • ${words.badges.listingType[property.listingType]} • ${words.badges.status[property.status]}`,
    `💰 ${words.property.price}: ${price}`, ...(details ? [details] : []), ...features, ...units, ...(address ? [`📍 ${address}`] : []),
    ...(property.description.trim() ? ["", `*${words.property.description}*`, property.description.trim()] : []),
    "", `🔗 ${locale === "ar" ? "عرض العقار" : "View property"}:`, `${origin}/properties/${property._id}`,
    ...(location ? ["", `📍 ${words.property.openLocation}:`, location] : []),
    ...(property.tiktokUrl ? ["", `🎬 ${words.property.watchOnTikTok}:`, property.tiktokUrl] : []),
  ].join("\n");
}

/** Short media caption that fits WhatsApp's caption field and excludes staff-only data. */
export function propertyVideoCaption(property: PropertyDTO, origin: string, locale: "en" | "ar") {
  const words = translations[locale];
  const labels: Record<string, string> = {
    "common.sar": words.common.sar, "property.priceOnRequest": words.property.priceOnRequest,
    "form.monthly": words.form.monthly, "form.yearly": words.form.yearly,
  };
  const price = formatPriceWithPeriod(property.price, property.listingType, property.rentalPeriod, key => labels[key] || key, locale);
  return [`*${property.title}*`, `${words.property.price}: ${price}`, `${origin}/properties/${property._id}`].join("\n").slice(0, 1024);
}

