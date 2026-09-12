"use client";

import type { PropertyListResponse } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function DashboardStats({ stats }: { stats: PropertyListResponse["stats"] }) {
  const { t } = useLanguage();

  const cards: { label: string; value: number; accent: string }[] = [
    { label: t("dashboard.stats.total"), value: stats.total, accent: "text-ink-800" },
    { label: t("dashboard.stats.builds"), value: stats.builds, accent: "text-ink-600" },
    { label: t("dashboard.stats.apartments"), value: stats.apartments, accent: "text-ink-600" },
    { label: t("dashboard.stats.lands"), value: stats.lands, accent: "text-ink-600" },
    { label: t("dashboard.stats.forSale"), value: stats.forSale, accent: "text-brass-600" },
    { label: t("dashboard.stats.forRent"), value: stats.forRent, accent: "text-moss-600" },
    { label: t("dashboard.stats.sold"), value: stats.sold, accent: "text-ink-500" },
    { label: t("dashboard.stats.rented"), value: stats.rented, accent: "text-ink-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-ink-100 bg-white p-4 shadow-card"
        >
          <p className={`font-display text-2xl font-semibold ${c.accent}`}>{c.value}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-400">
            {c.label}
          </p>
        </div>
      ))}
    </div>
  );
}
