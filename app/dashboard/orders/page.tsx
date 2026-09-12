"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OrdersStats } from "@/components/orders/OrdersStats";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { LoadingRow } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { fetchOrders, type OrderFilters } from "@/lib/api-client";
import type { OrderDTO, OrderListResponse } from "@/types/order";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useRequireRole } from "@/lib/auth/useRequireRole";

const EMPTY_STATS: OrderListResponse["stats"] = {
  total: 0,
  pending: 0,
  contacted: 0,
  fulfilled: 0,
  cancelled: 0,
};

export default function OrdersPage() {
  const { t } = useLanguage();
  const { ready } = useRequireRole(["admin", "sales_officer"], "/dashboard");
  const [filters, setFilters] = useState<OrderFilters>({ search: "", status: "", category: "" });
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  const load = useCallback(async (f: OrderFilters) => {
    setStatus("loading");
    try {
      const res = await fetchOrders({ ...f, limit: 100 });
      setOrders(res.data);
      setStats(res.stats);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timeout = setTimeout(() => load(filters), 250);
    return () => clearTimeout(timeout);
  }, [filters, load, ready]);

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass-600">
            {t("orders.eyebrow")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800">
            {t("orders.title")}
          </h1>
          <p className="mt-2 text-ink-500">{t("orders.subtitle")}</p>
        </div>
        <Link href="/dashboard/orders/new" className="btn-primary">
          {t("orders.logOrder")}
        </Link>
      </div>

      <div className="mb-8">
        <OrdersStats stats={stats} />
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-lg border border-ink-100 bg-white p-4 shadow-card sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="text"
          placeholder={t("orders.searchPlaceholder")}
          value={filters.search ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="input-field flex-1 min-w-[200px]"
        />
        <select
          value={filters.category ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value as OrderFilters["category"] }))}
          className="input-field sm:w-44"
        >
          <option value="">{t("filters.allCategories")}</option>
          <option value="apartment">{t("filters.apartment")}</option>
          <option value="build">{t("filters.build")}</option>
          <option value="land">{t("filters.land")}</option>
        </select>
        <select
          value={filters.status ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as OrderFilters["status"] }))}
          className="input-field sm:w-44"
        >
          <option value="">{t("orders.anyStatus")}</option>
          <option value="pending">{t("orders.statusPending")}</option>
          <option value="contacted">{t("orders.statusContacted")}</option>
          <option value="fulfilled">{t("orders.statusFulfilled")}</option>
          <option value="cancelled">{t("orders.statusCancelled")}</option>
        </select>
      </div>

      {status === "loading" && <LoadingRow />}
      {status === "error" && <ErrorState onRetry={() => load(filters)} />}
      {status === "ready" && orders.length === 0 && (
        <EmptyState
          title={t("orders.emptyTitle")}
          description={t("orders.emptyDesc")}
          actionLabel={t("orders.logOrder")}
          actionHref="/dashboard/orders/new"
        />
      )}
      {status === "ready" && orders.length > 0 && (
        <OrdersTable orders={orders} onChanged={setOrders} />
      )}
    </div>
  );
}
