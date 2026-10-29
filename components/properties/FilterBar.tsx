"use client";
import { SelectDropdown } from "@/components/ui/SelectDropdown";

import { AdvancedPropertyFilters } from "@/components/dashboard/AdvancedPropertyFilters";
import { dashboardFilterKeys, type DashboardFilterKey } from "@/lib/dashboard-filters";
import { Icon } from "@/components/ui/Icon";

import type { Category, ListingType, ListingStatus, ResidencyType } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export interface FilterState extends Partial<Record<DashboardFilterKey, string>> {
  visibility?: string;
  hasPrice?: string;
  hasImages?: string;
  hasTikTok?: string;
  hasMap?: string;
  propertyType?: string;
  minPrice?: string;
  maxPrice?: string;
  rooms?: string;
  location?: string;
  search: string;
  category: Category | "";
  listingType: ListingType | "";
  status: ListingStatus | "";
  residencyType: ResidencyType | "";
  sortBy: "createdAt" | "updatedAt" | "price" | "title";
  sortDir: "asc" | "desc";
}

export function FilterBar({
  value,
  onChange,
  hideCategory = false,
  hideResidencyType = false,
  staffFilters = false,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  hideCategory?: boolean;
  hideResidencyType?: boolean;
  staffFilters?: boolean;
}) {
  const { t, locale } = useLanguage();

  return (
    <div className="courtyard-filters">
      <div className="courtyard-filter-main">
      <label className="courtyard-filter-search">
        <span className="label-field">{t("filters.searchLabel")}</span>
        <div className="relative">
        <Icon name="search" className="pointer-events-none absolute start-3 top-3 h-5 w-5 text-ink-400" />
        <input
          type="search"
          placeholder={t("filters.searchPlaceholder")}
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          className="input-field !ps-11"
          aria-label={t("filters.searchPlaceholder")}
        />
        </div>
      </label>

      {!hideCategory && (
        <label className="min-w-0">
        <span className="label-field">{t("property.category")}</span>
<SelectDropdown
          value={value.category}
          onChange={(e) => onChange({ ...value, ...(e.target.value === "land" ? { listingType: "", residencyType: "", propertyType: "", rooms: "", maxRooms: "", bathrooms: "", maxBathrooms: "", hasKitchen: "", kitchenCabinetsInstalled: "", acInstalled: "", rentalPeriod: "", hasTenant: "", tenantName: "", tenantPhone: "", tenantId: "" } : {}), ...(["land", "apartment"].includes(e.target.value) ? { minUnits: "", maxUnits: "", unitName: "", unitRented: "", electricityNumber: "" } : {}), category: e.target.value as FilterState["category"] })}
          className="input-field"
          aria-label={t("filters.allCategories")}
        >
          <option value="">{t("filters.allCategories")}</option>
          <option value="build">{t("filters.build")}</option>
          <option value="apartment">{t("filters.apartment")}</option>
          <option value="land">{t("filters.land")}</option>
        </SelectDropdown>
      </label>
      )}

      {value.category !== "land" && <label className="min-w-0">
        <span className="label-field">{t("filters.typeLabel")}</span>
<SelectDropdown
        value={value.listingType}
        onChange={(e) => onChange({ ...value, listingType: e.target.value as FilterState["listingType"] })}
        className="input-field"
        aria-label={t("filters.saleAndRent")}
      >
        <option value="">{t("filters.saleAndRent")}</option>
        <option value="sale">{t("filters.forSale")}</option>
        <option value="rent">{t("filters.forRent")}</option>
      </SelectDropdown>
      </label>

      }
      <label className="min-w-0">
        <span className="label-field">{t("filters.statusLabel")}</span>
<SelectDropdown
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value as FilterState["status"] })}
        className="input-field"
        aria-label={t("filters.anyStatus")}
      >
        <option value="">{t("filters.anyStatus")}</option>
        <option value="available">{t("filters.available")}</option>
        <option value="sold">{t("filters.sold")}</option>
        <option value="rented">{t("filters.rented")}</option>
      </SelectDropdown>
      </label>

      <label className="min-w-0">
        <span className="label-field">{t("filters.sortLabel")}</span>
<SelectDropdown
        value={`${value.sortBy}:${value.sortDir}`}
        onChange={(e) => {
          const [sortBy, sortDir] = e.target.value.split(":") as [FilterState["sortBy"], FilterState["sortDir"]];
          onChange({ ...value, sortBy, sortDir });
        }}
        className="input-field"
        aria-label={t("filters.sortNewest")}
      >
        <option value="createdAt:desc">{t("filters.sortNewest")}</option>
        {staffFilters && <option value="updatedAt:desc">{locale === "ar" ? "الأحدث تحديثًا" : "Recently updated"}</option>}
        {staffFilters && <option value="updatedAt:asc">{locale === "ar" ? "الأقدم تحديثًا" : "Least recently updated"}</option>}
        <option value="createdAt:asc">{t("filters.sortOldest")}</option>
        <option value="price:asc">{t("filters.sortPriceLowHigh")}</option>
        <option value="price:desc">{t("filters.sortPriceHighLow")}</option>
        <option value="title:asc">{t("filters.sortTitleAZ")}</option>
      </SelectDropdown>
      </label>
      <details className="courtyard-filter-advanced"><summary><Icon name="filter" className="h-4 w-4" />{t("courtyard.moreFilters")}</summary><div className="courtyard-filter-options">
      {staffFilters && <>
        <label><span className="label-field">{t("form.visibility")}</span><SelectDropdown className="input-field" value={value.visibility || ""} onChange={e => onChange({ ...value, visibility: e.target.value })}><option value="">{locale === "ar" ? "الكل" : "All"}</option><option value="public">{t("form.visibilityPublic")}</option><option value="private">{t("form.visibilityPrivate")}</option></SelectDropdown></label>
        {([
          ["hasPrice", locale === "ar" ? "السعر" : "Price", locale === "ar" ? "بسعر" : "With price", locale === "ar" ? "بدون سعر" : "Without price"],
          ["hasImages", locale === "ar" ? "الصور" : "Photos", locale === "ar" ? "بصور" : "With photos", locale === "ar" ? "بدون صور" : "Without photos"],
          ["hasTikTok", "TikTok", locale === "ar" ? "برابط فيديو" : "With video link", locale === "ar" ? "بدون رابط فيديو" : "Without video link"],
          ["hasMap", locale === "ar" ? "رابط الخريطة" : "Saved map link", locale === "ar" ? "برابط خريطة" : "With map link", locale === "ar" ? "بدون رابط خريطة" : "Without map link"],
        ] as const).map(([key, label, yes, no]) => <label key={key}><span className="label-field">{label}</span><SelectDropdown className="input-field" value={value[key] || ""} onChange={e => onChange({ ...value, [key]: e.target.value })}><option value="">{locale === "ar" ? "الكل" : "All"}</option><option value="yes">{yes}</option><option value="no">{no}</option></SelectDropdown></label>)}
      </>}
      {!hideResidencyType && value.category !== "land" && (
        <label className="min-w-0">
        <span className="label-field">{t("form.residencyType")}</span>
<SelectDropdown
          value={value.residencyType}
          onChange={(e) => onChange({ ...value, residencyType: e.target.value as FilterState["residencyType"] })}
          className="input-field"
          aria-label={t("form.residencyType")}
        >
          <option value="">{t("filters.anyResidencyType")}</option>
          <option value="family">{t("form.residencyTypeFamily")}</option>
          <option value="singles">{t("form.residencyTypeSingles")}</option>
          <option value="women_only">{t("form.residencyTypeWomenOnly")}</option>
        </SelectDropdown>
      </label>
      )}

      {value.category !== "land" && <>
        <label><span className="label-field">{t("offer.propertyType")}</span><SelectDropdown className="input-field" value={value.propertyType ?? ""} onChange={e => onChange({ ...value, propertyType: e.target.value })}><option value="">{t("courtyard.anyPropertyType")}</option>{["villa", "apartment", "duplex", "floor", "shop", "other"].map(type => <option key={type} value={type}>{t(`offer.types.${type}`)}</option>)}</SelectDropdown></label>
        <label><span className="label-field">{t("courtyard.minRooms")}</span><SelectDropdown className="input-field" value={value.rooms ?? ""} onChange={e => onChange({ ...value, rooms: e.target.value })}><option value="">{t("courtyard.anyRooms")}</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}</SelectDropdown></label>
      </>}
      <label><span className="label-field">{t("courtyard.minPrice")}</span><input type="number" min="0" className="input-field" value={value.minPrice ?? ""} onChange={e => onChange({ ...value, minPrice: e.target.value })} /></label>
      <label><span className="label-field">{t("courtyard.maxPrice")}</span><input type="number" min="0" className="input-field" value={value.maxPrice ?? ""} onChange={e => onChange({ ...value, maxPrice: e.target.value })} /></label>
      <label><span className="label-field">{t("courtyard.location")}</span><input className="input-field" value={value.location ?? ""} onChange={e => onChange({ ...value, location: e.target.value })} /></label>
      {staffFilters && <AdvancedPropertyFilters value={value} onChange={onChange} />}
      </div></details>

      </div>
      {(dashboardFilterKeys.some(key => value[key]) || value.visibility || value.hasPrice || value.hasImages || value.hasTikTok || value.hasMap || value.propertyType || value.minPrice || value.maxPrice || value.rooms || value.location || value.search || (!hideCategory && value.category) || value.listingType || value.status || (!hideResidencyType && value.residencyType) || value.sortBy !== "createdAt" || value.sortDir !== "desc") && (
        <div className="courtyard-filter-reset">
          <button type="button" className="text-sm font-semibold text-moss-600 underline-offset-4 hover:underline" onClick={() => onChange({ search: "", category: hideCategory ? value.category : "", listingType: "", status: "", residencyType: "", sortBy: "createdAt", sortDir: "desc" })}>
            {t("filters.reset")}
          </button>
        </div>
      )}
    </div>
  );
}
