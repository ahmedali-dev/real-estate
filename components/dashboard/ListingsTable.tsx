"use client";

import Link from "next/link";
import { useState } from "react";
import type { PropertyDTO } from "@/types/property";
import { CategoryBadge } from "@/components/properties/CategoryBadge";
import { ListingTypeBadge } from "@/components/properties/ListingTypeBadge";
import { StatusBadge } from "@/components/properties/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate, formatLocation, formatPriceWithPeriod } from "@/lib/format";
import { deleteProperty } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function ListingsTable({
  properties,
  onDeleted,
}: {
  properties: PropertyDTO[];
  onDeleted: (id: string) => void;
}) {
  const { t, locale } = useLanguage();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!pendingId) return;
    setDeleting(true);
    try {
      await deleteProperty(pendingId);
      onDeleted(pendingId);
    } finally {
      setDeleting(false);
      setPendingId(null);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-ink-100 bg-white shadow-card">
        <table className="w-full min-w-[720px] text-start text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <th className="px-4 py-3 text-start font-semibold">{t("dashboard.table.listing")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("dashboard.table.category")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("dashboard.table.listingType")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("dashboard.table.status")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("dashboard.table.price")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("dashboard.table.location")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("dashboard.table.updated")}</th>
              <th className="px-4 py-3 text-end font-semibold">{t("dashboard.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p._id} className="border-b border-ink-50 last:border-0 hover:bg-stone-50">
                <td className="px-4 py-3">
                  <Link href={`/properties/${p._id}`} className="font-medium text-ink-800 hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <CategoryBadge category={p.category} />
                </td>
                <td className="px-4 py-3">
                  <ListingTypeBadge listingType={p.listingType} size="sm" />
                </td>
                <td className="px-4 py-3">
                  {p.status === "available" ? (
                    <span className="text-xs font-medium text-ink-400">{t("filters.available")}</span>
                  ) : (
                    <StatusBadge status={p.status} size="sm" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-ink-700">
                  {formatPriceWithPeriod(p.price, p.listingType, p.rentalPeriod, t)}
                </td>
                <td className="px-4 py-3 text-ink-500">{formatLocation(p.location, t)}</td>
                <td className="px-4 py-3 text-ink-400">{formatDate(p.updatedAt, locale)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/dashboard/${p._id}/edit`} className="btn-secondary px-3 py-1.5 text-xs">
                      {t("common.edit")}
                    </Link>
                    <button
                      onClick={() => setPendingId(p._id)}
                      className="btn-danger px-3 py-1.5 text-xs"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(pendingId)}
        title={t("states.confirmDeleteTitle")}
        description={t("states.confirmDeleteDesc")}
        confirmLabel={t("states.confirmDeleteButton")}
        cancelLabel={t("common.cancel")}
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingId(null)}
      />
    </>
  );
}
