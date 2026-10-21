"use client";

import { useCallback, useEffect, useState, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { readDashboardUrl, writeDashboardUrl } from "@/lib/dashboard-url";
import { CopyButton } from "@/components/ui/CopyButton";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { ListingsTable } from "@/components/dashboard/ListingsTable";
import { FilterBar, type FilterState } from "@/components/properties/FilterBar";
import { LoadingRow } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { fetchProperties, ApiClientError } from "@/lib/api-client";
import type { PropertyDTO, PropertyListResponse } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useRequireRole } from "@/lib/auth/useRequireRole";

const EMPTY_STATS: PropertyListResponse["stats"] = {
  total: 0,
  builds: 0,
  apartments: 0,
  lands: 0,
  forSale: 0,
  forRent: 0,
  available: 0,
  sold: 0,
  rented: 0,
};

export default function DashboardClient(props: { publicOrigin: string | null }) {
  return <Suspense fallback={<LoadingRow />}><DashboardContent {...props} /></Suspense>;
}

function DashboardContent({ publicOrigin }: { publicOrigin: string | null }) {
  const { t, locale } = useLanguage();
  const { ready, role } = useRequireRole(["admin", "real_estate_officer", "project_manager"], "/dashboard/orders");
  const isProjectManager = role === "project_manager";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const [browserOrigin, setBrowserOrigin] = useState("");
  useEffect(() => { setBrowserOrigin(window.location.origin); }, []);
  const filterUrl = browserOrigin ? `${browserOrigin}${pathname}${query ? `?${query}` : ""}` : "";
  const { filters, page, pageSize } = useMemo(() => readDashboardUrl(new URLSearchParams(query), isProjectManager), [query, isProjectManager]);
  const navigate = useCallback((next: FilterState, nextPage: number, size: number, replace = false) => {
    const qs = writeDashboardUrl(new URLSearchParams(query), next, nextPage, size, isProjectManager);
    const url = `${pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
    if (replace) window.history.replaceState(null, "", url); else window.history.pushState(null, "", url);
  }, [query, pathname, isProjectManager]);
  function setPage(next: number) { navigate(filters, next, pageSize); }
  const [properties, setProperties] = useState<PropertyDTO[]>([]);
  const [total, setTotal] = useState(0);
  const requestVersion = useRef(0);
  const results = useRef<HTMLDivElement>(null);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const [stats, setStats] = useState(EMPTY_STATS);
  const [filterError, setFilterError] = useState("");
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  const load = useCallback(async (f: FilterState, currentPage: number, size: number) => {
    const version = ++requestVersion.current;
    setStatus("loading");
    setFilterError("");
    try {
      const res = await fetchProperties({ ...f, page: currentPage, limit: size });
      if (version !== requestVersion.current) return;
      const lastPage = Math.max(1, Math.ceil(res.total / size));
      if (currentPage > lastPage) { navigate(f, lastPage, size, true); return; }
      setTotal(res.total);
      setProperties(res.data);
      setStats(res.stats);
      setStatus("ready");
    } catch (error) {
      if (version !== requestVersion.current) return;
      if (error instanceof ApiClientError && error.status === 400) setFilterError(error.message);
      setStatus("error");
    }
  }, [navigate]);

  useEffect(() => {
    if (!ready) return;
    const timeout = setTimeout(() => load(filters, page, pageSize), 250);
    return () => {
      clearTimeout(timeout);
      // Invalidate the numeric request generation, not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestVersion.current++;
    };
  }, [filters, load, ready, isProjectManager, page, pageSize]);

  function handleDeleted() {
    load(filters, page, pageSize);
  }

  function handleVisibilityChanged(id: string, visibility: "public" | "private") {
    setProperties((prev) => prev.map((p) => (p._id === id ? { ...p, visibility } : p)));
  }

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass-600">
            {t("dashboard.eyebrow")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800">
            {t("dashboard.title")}
          </h1>
          <p className="mt-2 text-ink-500">{t("dashboard.subtitle")}</p>
        </div>
        <Link href="/dashboard/new" className="btn-primary">
          {t("dashboard.addListing")}
        </Link>
      </div>

      <div className="mb-8">
        <DashboardStats stats={stats} />
      </div>

      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-500">{locale === "ar" ? "الفلاتر محفوظة في الرابط. يلزم تسجيل الدخول لفتح لوحة التحكم." : "Filters are saved in the URL. Sign-in is required to open the dashboard."}</p>
          <div className="flex items-center gap-2"><span className="text-sm font-medium text-ink-600">{locale === "ar" ? "رابط الفلاتر" : "Filter URL"}</span><CopyButton text={filterUrl} label={locale === "ar" ? "نسخ رابط الفلاتر" : "Copy filter URL"} /></div>
        </div>
        <FilterBar staffFilters value={filters} onChange={value => { requestVersion.current++; navigate(value, 1, pageSize); }} hideCategory={isProjectManager} />
      </div>

      <div ref={results} className="mb-4 flex scroll-mt-6 flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-ink-500">{status === "ready" ? (locale === "ar" ? `عرض ${total ? (page - 1) * pageSize + 1 : 0}–${Math.min(page * pageSize, total)} من ${total} عقار` : `Showing ${total ? (page - 1) * pageSize + 1 : 0}–${Math.min(page * pageSize, total)} of ${total} properties`) : ""}</p>
        <label className="flex items-center gap-2 text-sm text-ink-600">{locale === "ar" ? "عقارات لكل صفحة" : "Properties per page"}<select className="rounded-lg border border-ink-100 bg-white px-3 py-2" value={pageSize} onChange={event => { requestVersion.current++; navigate(filters, 1, Number(event.target.value)); }}>{[10, 20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
      </div>
      {status === "loading" && <LoadingRow />}
      {status === "error" && (filterError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{filterError}</p> : <ErrorState onRetry={() => load(filters, page, pageSize)} />)}
      {status === "ready" && properties.length === 0 && (
        <EmptyState
          title={t("dashboard.emptyTitle")}
          description={t("dashboard.emptyDesc")}
          actionLabel={t("browse.addListingCta")}
          actionHref="/dashboard/new"
        />
      )}
      {status === "ready" && properties.length > 0 && (
        <ListingsTable publicOrigin={publicOrigin} properties={properties} onDeleted={handleDeleted} onVisibilityChanged={handleVisibilityChanged} />
      )}
      {status === "ready" && pages > 1 && <nav className="courtyard-pagination mt-6" aria-label={t("courtyard.pagination")}>
        <button type="button" disabled={page === 1} onClick={() => { setPage(page - 1); results.current?.scrollIntoView({ behavior: "smooth" }); }}>{t("courtyard.previous")}</button>
        {Array.from({ length: pages }, (_, index) => index + 1).filter(n => n === 1 || n === pages || Math.abs(n - page) <= 1).map((n, index, nums) => <span key={n}>{index > 0 && n - nums[index - 1] > 1 && <span className="px-2">…</span>}<button type="button" aria-current={page === n ? "page" : undefined} aria-label={t("courtyard.page", { page: n, pages })} onClick={() => { setPage(n); results.current?.scrollIntoView({ behavior: "smooth" }); }}>{n}</button></span>)}
        <button type="button" disabled={page >= pages} onClick={() => { setPage(page + 1); results.current?.scrollIntoView({ behavior: "smooth" }); }}>{t("courtyard.next")}</button>
      </nav>}
    </div>
  );
}
