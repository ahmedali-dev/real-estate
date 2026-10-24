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
    <div className="estate-stats grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="estate-stat rounded-xl border border-ink-100 bg-white p-5"
        >
          <p className={`font-mono text-3xl font-medium ${c.accent}`}>{c.value}</p>
          <p className="mt-1 text-sm font-medium text-ink-500">
            {c.label}
          </p>
        </div>
      ))}
    </div>
  );
}
