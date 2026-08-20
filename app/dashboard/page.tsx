"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { ListingsTable } from "@/components/dashboard/ListingsTable";
import { FilterBar, type FilterState } from "@/components/properties/FilterBar";
import { LoadingRow } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { fetchProperties } from "@/lib/api-client";
import type { PropertyDTO, PropertyListResponse } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const DEFAULT_FILTERS: FilterState = {
  search: "",
  category: "",
  listingType: "",
  status: "",
  sortBy: "createdAt",
  sortDir: "desc",
};

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

export default function DashboardPage() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [properties, setProperties] = useState<PropertyDTO[]>([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  const load = useCallback(async (f: FilterState) => {
    setStatus("loading");
    try {
      const res = await fetchProperties({ ...f, limit: 100 });
      setProperties(res.data);
      setStats(res.stats);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => load(filters), 250);
    return () => clearTimeout(timeout);
  }, [filters, load]);

  function handleDeleted(id: string) {
    setProperties((prev) => prev.filter((p) => p._id !== id));
    setStats((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
  }

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
        <FilterBar value={filters} onChange={setFilters} />
      </div>

      {status === "loading" && <LoadingRow />}
      {status === "error" && <ErrorState onRetry={() => load(filters)} />}
      {status === "ready" && properties.length === 0 && (
        <EmptyState
          title={t("dashboard.emptyTitle")}
          description={t("dashboard.emptyDesc")}
          actionLabel={t("browse.addListingCta")}
          actionHref="/dashboard/new"
        />
      )}
      {status === "ready" && properties.length > 0 && (
        <ListingsTable properties={properties} onDeleted={handleDeleted} />
      )}
    </div>
  );
}
