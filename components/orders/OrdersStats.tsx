"use client";

import type { OrderListResponse } from "@/types/order";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function OrdersStats({ stats }: { stats: OrderListResponse["stats"] }) {
  const { t } = useLanguage();

  const cards: { label: string; value: number; accent: string }[] = [
    { label: t("orders.statsTotal"), value: stats.total, accent: "text-ink-800" },
    { label: t("orders.statusPending"), value: stats.pending, accent: "text-brass-600" },
    { label: t("orders.statusContacted"), value: stats.contacted, accent: "text-ink-600" },
    { label: t("orders.statusFulfilled"), value: stats.fulfilled, accent: "text-moss-600" },
    { label: t("orders.statusCancelled"), value: stats.cancelled, accent: "text-rust-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-ink-100 bg-white p-4 shadow-card">
          <p className={`font-display text-2xl font-semibold ${c.accent}`}>{c.value}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-400">{c.label}</p>
        </div>
      ))}
    </div>
  );
}
