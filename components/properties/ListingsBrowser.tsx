"use client";

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { readListingUrl, writeListingUrl } from "@/lib/listing-url";
import { useSession } from "next-auth/react";
import { PropertiesMap } from "./PropertiesMap";
import { Icon } from "@/components/ui/Icon";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { FilterBar, type FilterState } from "@/components/properties/FilterBar";
import { LoadingGrid } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { fetchProperties } from "@/lib/api-client";
import type { Category, PropertyDTO } from "@/types/property";
import type { UserRole } from "@/types/user";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const LISTINGS_ROLES: UserRole[] = ["admin", "real_estate_officer", "project_manager"];

/**
 * Shared browse/filter/grid view. When `fixedCategory` is provided (used by
 * the dedicated /apartments, /builds, /lands pages), the category filter is
 * locked and hidden from the FilterBar rather than duplicating this whole
 * page three times.
 */
export function ListingsBrowser(props: { fixedCategory?: Category; eyebrowKey: string; titleKey: string; subtitleKey: string }) {
  return <Suspense fallback={<LoadingGrid count={6} />}><ListingsBrowserContent {...props} /></Suspense>;
}

function ListingsBrowserContent({
  fixedCategory,
  eyebrowKey,
  titleKey,
  subtitleKey,
}: {
  fixedCategory?: Category;
  eyebrowKey: string;
  titleKey: string;
  subtitleKey: string;
}) {
  const { t, locale } = useLanguage();
  const { data: session } = useSession();
  const canAddListing = Boolean(session?.user.role && LISTINGS_ROLES.includes(session.user.role));
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const { filters, page } = useMemo(() => readListingUrl(new URLSearchParams(query), fixedCategory), [query, fixedCategory]);
  function navigate(next: FilterState, nextPage: number, replace = false) {
    const qs = writeListingUrl(new URLSearchParams(query), next, nextPage, fixedCategory);
    const url = `${pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
    if (replace) window.history.replaceState(null, "", url); else window.history.pushState(null, "", url);
  }
  function setPage(next: number) { navigate(filters, next); }
  const results = useRef<HTMLDivElement>(null);
  const pageSize = 12;
  const [properties, setProperties] = useState<PropertyDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  const requestId = useRef(0);

  const load = useCallback(async (f: FilterState) => {
    const id = ++requestId.current;
    setStatus("loading");
    try {
      const res = await fetchProperties({ ...f, category: fixedCategory ?? f.category, limit: pageSize, page });
      if (id !== requestId.current) return;
      setProperties(res.data);
      setTotal(res.total);
      setStatus("ready");
    } catch {
      if (id === requestId.current) setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedCategory, page]);

  useEffect(() => {
    requestId.current += 1;
    const timeout = setTimeout(() => load(filters), 250);
    return () => { clearTimeout(timeout); requestId.current += 1; };
  }, [filters, load]);

  return (
    <div className="courtyard-browser estate-browser">
      <section className="estate-browse-hero">
        <div className="estate-browse-container">
          <p className="estate-eyebrow">{t(eyebrowKey)}</p>
          <h1>{fixedCategory ? t(titleKey) : locale === "ar" ? "ابحث عن مساحة تناسب حياتك." : "Find a place that feels like yours."}</h1>
          <p className="estate-hero-description">{fixedCategory ? t(subtitleKey) : locale === "ar" ? "شقق وفلل ومبانٍ وأراضٍ. تفاصيل واضحة وتواصل مباشر مع مكتبنا." : "Apartments, villas, buildings and land. Clear details, direct contact with our office."}</p>
          <div className="estate-search-panel">
            {fixedCategory !== "land" && <div className="estate-listing-tabs" aria-label={t("filters.typeLabel")}>{[["", t("filters.saleAndRent")], ["rent", t("filters.forRent")], ["sale", t("filters.forSale")]].map(([value, label]) => <button key={value} type="button" aria-pressed={filters.listingType === value} onClick={() => navigate({ ...filters, listingType: value as FilterState["listingType"] }, 1)}>{label}</button>)}</div>}
            <FilterBar value={filters} onChange={next => navigate(next, 1)} hideCategory={Boolean(fixedCategory)} hideResidencyType={fixedCategory === "land" || !session?.user} />
          </div>
        </div>
      </section>
      <div className="estate-browse-container estate-results-container">
        <div className="estate-results-heading"><div><h2>{t(titleKey)}</h2><p>{status === "ready" ? t("browse.resultsCount", { count: total }) : locale === "ar" ? "جارٍ تحميل العقارات…" : "Loading properties…"}</p></div><div className="estate-view-toggle"><button type="button" onClick={() => results.current?.scrollIntoView({ behavior: "smooth" })}><Icon name="grid" className="h-4 w-4" />{locale === "ar" ? "العقارات" : "Listings"}</button><a href="#properties-map"><Icon name="location" className="h-4 w-4" />{locale === "ar" ? "الخريطة" : "Map"}</a></div></div>
        <div className="estate-filter-chips">{[
          { key: "status", value: filters.status, label: filters.status ? t(`badges.status.${filters.status}`) : "" },
          { key: "listingType", value: filters.listingType, label: filters.listingType ? t(`badges.listingType.${filters.listingType}`) : "" },
          { key: "propertyType", value: filters.propertyType, label: filters.propertyType ? t(`offer.types.${filters.propertyType}`) : "" },
          { key: "search", value: filters.search, label: filters.search },
          { key: "location", value: filters.location, label: filters.location },
          { key: "minPrice", value: filters.minPrice, label: `${t("courtyard.minPrice")}: ${filters.minPrice}` },
          { key: "maxPrice", value: filters.maxPrice, label: `${t("courtyard.maxPrice")}: ${filters.maxPrice}` },
          { key: "rooms", value: filters.rooms, label: `${filters.rooms}+ ${t("property.rooms")}` },
        ].filter(chip => chip.value).map(chip => <button type="button" key={chip.key} aria-label={`${t("filters.reset")}: ${chip.label}`} onClick={() => navigate({ ...filters, [chip.key]: "" }, 1)}>{chip.label}<span aria-hidden="true">×</span></button>)}</div>
      <div ref={results} className="scroll-mt-6">
      {status === "loading" && <LoadingGrid count={6} />}

      {status === "error" && <ErrorState onRetry={() => load(filters)} />}

      {status === "ready" && properties.length === 0 && (
        <EmptyState
          title={t("browse.emptyTitle")}
          description={t("browse.emptyDesc")}
          actionLabel={canAddListing ? t("browse.addListingCta") : undefined}
          actionHref={canAddListing ? "/dashboard/new" : undefined}
        />
      )}

      {status === "ready" && properties.length > 0 && (
        <>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <PropertyCard key={p._id} property={p} />
            ))}
          </div>
        </>
      )}
      {status === "ready" && total > pageSize && <nav className="courtyard-pagination" aria-label={t("courtyard.pagination")}><button type="button" disabled={page === 1} onClick={() => { setPage(page - 1); results.current?.scrollIntoView({ behavior: "smooth" }); }}>{t("courtyard.previous")}</button>{Array.from({ length: Math.ceil(total / pageSize) }, (_, index) => index + 1).filter(n => n === 1 || n === Math.ceil(total / pageSize) || Math.abs(n - page) <= 1).map((n, index, nums) => <span key={n}>{index > 0 && n - nums[index - 1] > 1 && <span className="px-2">…</span>}<button type="button" aria-current={page === n ? "page" : undefined} aria-label={t("courtyard.page", { page: n, pages: Math.ceil(total / pageSize) })} onClick={() => { setPage(n); results.current?.scrollIntoView({ behavior: "smooth" }); }}>{n}</button></span>)}<button type="button" disabled={page >= Math.ceil(total / pageSize)} onClick={() => { setPage(page + 1); results.current?.scrollIntoView({ behavior: "smooth" }); }}>{t("courtyard.next")}</button></nav>}
      </div>
      <PropertiesMap filters={filters} />
      </div>
    </div>
  );
}
