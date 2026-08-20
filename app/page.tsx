"use client";

import { useEffect, useState, useCallback } from "react";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { FilterBar, type FilterState } from "@/components/properties/FilterBar";
import { LoadingGrid } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { fetchProperties } from "@/lib/api-client";
import type { PropertyDTO } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const DEFAULT_FILTERS: FilterState = {
  search: "",
  category: "",
  listingType: "",
  status: "",
  sortBy: "createdAt",
  sortDir: "desc",
};

export default function BrowsePage() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [properties, setProperties] = useState<PropertyDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  const load = useCallback(async (f: FilterState) => {
    setStatus("loading");
    try {
      const res = await fetchProperties({ ...f, limit: 48 });
      setProperties(res.data);
      setTotal(res.total);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => load(filters), 250);
    return () => clearTimeout(timeout);
  }, [filters, load]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-brass-600">
          {t("browse.eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800 sm:text-4xl">
          {t("browse.title")}
        </h1>
        <p className="mt-3 text-ink-500">{t("browse.subtitle")}</p>
      </div>

      <div className="mb-6">
        <FilterBar value={filters} onChange={setFilters} />
      </div>

      {status === "loading" && <LoadingGrid count={6} />}

      {status === "error" && <ErrorState onRetry={() => load(filters)} />}

      {status === "ready" && properties.length === 0 && (
        <EmptyState
          title={t("browse.emptyTitle")}
          description={t("browse.emptyDesc")}
          actionLabel={t("browse.addListingCta")}
          actionHref="/dashboard/new"
        />
      )}

      {status === "ready" && properties.length > 0 && (
        <>
          <p className="mb-4 text-sm text-ink-400">{t("browse.resultsCount", { count: total })}</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <PropertyCard key={p._id} property={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
