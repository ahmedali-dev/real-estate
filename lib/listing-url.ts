import type { FilterState } from "@/components/properties/FilterBar";
import type { Category } from "@/types/property";

const keys = ["search", "category", "listingType", "status", "residencyType", "sortBy", "sortDir", "propertyType", "rooms", "minPrice", "maxPrice", "location", "page"] as const;
export function readListingUrl(params: URLSearchParams, fixedCategory?: Category): { filters: FilterState; page: number } {
  function choice<T extends string>(key: string, options: readonly T[], fallback: T | "" = ""): T | "" { const value = params.get(key); return options.includes(value as T) ? value as T : fallback; }
  function number(key: string) { const raw = params.get(key); return raw && Number.isFinite(Number(raw)) && Number(raw) >= 0 ? raw : ""; }
  const category = fixedCategory || choice("category", ["apartment", "build", "land"] as const);
  const land = category === "land";
  const filters: FilterState = {
    search: (params.get("search") || "").slice(0, 200), category,
    listingType: land ? "" : choice("listingType", ["sale", "rent"]),
    status: params.get("status") === "all" ? "" : choice("status", ["available", "sold", "rented"], "available"),
    residencyType: land ? "" : choice("residencyType", ["family", "singles", "women_only"]),
    sortBy: choice("sortBy", ["createdAt", "updatedAt", "price", "title"], "createdAt") as FilterState["sortBy"],
    sortDir: choice("sortDir", ["asc", "desc"], "desc") as FilterState["sortDir"],
    propertyType: land ? "" : choice("propertyType", ["villa", "apartment", "duplex", "floor", "shop", "other"]),
    rooms: land ? "" : number("rooms"), minPrice: number("minPrice"), maxPrice: number("maxPrice"), location: (params.get("location") || "").slice(0, 200),
  };
  const page = Number(params.get("page") || 1);
  return { filters, page: Number.isSafeInteger(page) && page > 0 ? page : 1 };
}
export function writeListingUrl(current: URLSearchParams, filters: FilterState, page: number, fixedCategory?: Category) {
  const params = new URLSearchParams(current);
  for (const key of keys) params.delete(key);
  const normalized = readListingUrl(new URLSearchParams(Object.entries(filters).filter(([, value]) => value != null).map(([key, value]) => [key, value || (key === "status" ? "all" : "")])), fixedCategory).filters;
  for (const key of keys) {
    if (key === "page" || (key === "category" && fixedCategory)) continue;
    const value = normalized[key];
    if (key === "status") { if (!value) params.set(key, "all"); else if (value !== "available") params.set(key, value); }
    else if (value && !(key === "sortBy" && value === "createdAt") && !(key === "sortDir" && value === "desc")) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  return params.toString();
}
