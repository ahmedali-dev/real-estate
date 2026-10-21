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
  const { t } = useLanguage();
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
    <div className="courtyard-browser mx-auto max-w-[1440px] px-4 py-6 sm:py-10 sm:px-6 lg:px-8">
      <div className="courtyard-hero">
        <div><p className="courtyard-eyebrow">
          {t(eyebrowKey)}
        </p>
        <h1 className="courtyard-title">
          {t(titleKey)}
        </h1>
        <p className="courtyard-description">{t(subtitleKey)}</p><a href="#properties-map" className="courtyard-map-link">{t("courtyard.mapLink")} ↓</a></div>
        <div className="courtyard-hero-art" aria-hidden="true"><svg viewBox="0 0 500 320"><rect width="500" height="320" fill="#dee4d4"/><circle cx="396" cy="53" r="30" fill="#f2eccd"/><path d="M0 234 170 200 500 244v90H0Z" fill="#c1cbb5"/><path d="M103 219V103l111-42 173 55v154l-173-27Z" fill="#ebe9dc"/><path d="M214 61v182l173 27V116Z" fill="#cfdbc9"/><path d="M140 119v60l40-12V107ZM250 125v67l40 10v-68ZM322 148v66l39 11v-66Z" fill="#7f9680"/><path d="M132 219v-17l55-13v43ZM267 256v-36l47 11v38Z" fill="#a5b69d"/><path d="M0 278 215 241 500 289" stroke="#f0eedf" strokeWidth="20" fill="none"/></svg><span><Icon name={fixedCategory === "land" ? "land" : fixedCategory === "build" ? "building" : "home"} className="h-5 w-5" />{t("courtyard.snapshot")}</span></div>
      </div>

      <div className="mb-8">
        <FilterBar
          value={filters}
          onChange={next => {
            navigate(next, 1);
          }}
          hideCategory={Boolean(fixedCategory)}
          hideResidencyType={fixedCategory === "land" || !session?.user}
        />
      </div>

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
          <p role="status" className="mb-5 text-sm font-medium text-ink-500">{t("browse.resultsCount", { count: total })}</p>
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
  );
}
