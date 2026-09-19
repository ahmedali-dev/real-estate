"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
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
export function ListingsBrowser({
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
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: fixedCategory ?? "",
    listingType: "",
    status: "",
    residencyType: "",
    sortBy: "createdAt",
    sortDir: "desc",
  });
  const [properties, setProperties] = useState<PropertyDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  const load = useCallback(async (f: FilterState) => {
    setStatus("loading");
    try {
      const res = await fetchProperties({ ...f, category: fixedCategory ?? f.category, limit: 48 });
      setProperties(res.data);
      setTotal(res.total);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedCategory]);

  useEffect(() => {
    const timeout = setTimeout(() => load(filters), 250);
    return () => clearTimeout(timeout);
  }, [filters, load]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-brass-600">
          {t(eyebrowKey)}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800 sm:text-4xl">
          {t(titleKey)}
        </h1>
        <p className="mt-3 text-ink-500">{t(subtitleKey)}</p>
      </div>

      <div className="mb-6">
        <FilterBar
          value={filters}
          onChange={setFilters}
          hideCategory={Boolean(fixedCategory)}
          hideResidencyType={fixedCategory === "land" || !session?.user}
        />
      </div>

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
