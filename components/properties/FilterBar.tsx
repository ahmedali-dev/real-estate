"use client";

import type { Category, ListingType, ListingStatus, ResidencyType } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export interface FilterState {
  search: string;
  category: Category | "";
  listingType: ListingType | "";
  status: ListingStatus | "";
  residencyType: ResidencyType | "";
  sortBy: "createdAt" | "price" | "title";
  sortDir: "asc" | "desc";
}

export function FilterBar({
  value,
  onChange,
  hideCategory = false,
  hideResidencyType = false,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  hideCategory?: boolean;
  hideResidencyType?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-ink-100 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:flex-wrap">
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder={t("filters.searchPlaceholder")}
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          className="input-field"
          aria-label={t("filters.searchPlaceholder")}
        />
      </div>

      {!hideCategory && (
        <select
          value={value.category}
          onChange={(e) => onChange({ ...value, category: e.target.value as FilterState["category"] })}
          className="input-field sm:w-44"
          aria-label={t("filters.allCategories")}
        >
          <option value="">{t("filters.allCategories")}</option>
          <option value="build">{t("filters.build")}</option>
          <option value="apartment">{t("filters.apartment")}</option>
          <option value="land">{t("filters.land")}</option>
        </select>
      )}

      <select
        value={value.listingType}
        onChange={(e) => onChange({ ...value, listingType: e.target.value as FilterState["listingType"] })}
        className="input-field sm:w-40"
        aria-label={t("filters.saleAndRent")}
      >
        <option value="">{t("filters.saleAndRent")}</option>
        <option value="sale">{t("filters.forSale")}</option>
        <option value="rent">{t("filters.forRent")}</option>
      </select>

      <select
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value as FilterState["status"] })}
        className="input-field sm:w-40"
        aria-label={t("filters.anyStatus")}
      >
        <option value="">{t("filters.anyStatus")}</option>
        <option value="available">{t("filters.available")}</option>
        <option value="sold">{t("filters.sold")}</option>
        <option value="rented">{t("filters.rented")}</option>
      </select>

      {!hideResidencyType && (
        <select
          value={value.residencyType}
          onChange={(e) => onChange({ ...value, residencyType: e.target.value as FilterState["residencyType"] })}
          className="input-field sm:w-44"
          aria-label={t("form.residencyType")}
        >
          <option value="">{t("filters.anyResidencyType")}</option>
          <option value="family">{t("form.residencyTypeFamily")}</option>
          <option value="singles">{t("form.residencyTypeSingles")}</option>
          <option value="women_only">{t("form.residencyTypeWomenOnly")}</option>
        </select>
      )}

      <select
        value={`${value.sortBy}:${value.sortDir}`}
        onChange={(e) => {
          const [sortBy, sortDir] = e.target.value.split(":") as [FilterState["sortBy"], FilterState["sortDir"]];
          onChange({ ...value, sortBy, sortDir });
        }}
        className="input-field sm:w-48"
        aria-label={t("filters.sortNewest")}
      >
        <option value="createdAt:desc">{t("filters.sortNewest")}</option>
        <option value="createdAt:asc">{t("filters.sortOldest")}</option>
        <option value="price:asc">{t("filters.sortPriceLowHigh")}</option>
        <option value="price:desc">{t("filters.sortPriceHighLow")}</option>
        <option value="title:asc">{t("filters.sortTitleAZ")}</option>
      </select>
    </div>
  );
}
