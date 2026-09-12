"use client";

import Link from "next/link";
import { useState } from "react";
import type { OrderDTO, OrderStatus } from "@/types/order";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteOrder, updateOrder } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatDate } from "@/lib/format";
import { useSession } from "next-auth/react";

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-brass-100 text-brass-600",
  contacted: "bg-ink-100 text-ink-600",
  fulfilled: "bg-moss-100 text-moss-600",
  cancelled: "bg-rust-50 text-rust-500",
};

export function OrdersTable({
  orders,
  onChanged,
}: {
  orders: OrderDTO[];
  onChanged: (updated: OrderDTO[]) => void;
}) {
  const { t, locale } = useLanguage();
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "admin";
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleStatusChange(order: OrderDTO, status: OrderStatus) {
    const optimistic = orders.map((o) => (o._id === order._id ? { ...o, status } : o));
    onChanged(optimistic);
    try {
      await updateOrder(order._id, {
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        requestedCategory: order.requestedCategory,
        requestedListingType: order.requestedListingType,
        notes: order.notes,
        status,
      });
    } catch {
      onChanged(orders);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await deleteOrder(pendingDeleteId);
      onChanged(orders.filter((o) => o._id !== pendingDeleteId));
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-ink-100 bg-white shadow-card">
        <table className="w-full min-w-[720px] text-start text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <th className="px-4 py-3 text-start font-semibold">{t("orders.customer")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("orders.wants")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("orders.notes")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("orders.status")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("dashboard.table.updated")}</th>
              <th className="px-4 py-3 text-end font-semibold">{t("dashboard.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id} className="border-b border-ink-50 last:border-0 hover:bg-stone-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink-800">{order.customerName}</p>
                  <p className="text-xs text-ink-400">{order.customerPhone}</p>
                  {order.loggedBy?.name && (
                    <p className="mt-0.5 text-[11px] text-ink-300">
                      {t("orders.loggedBy")}: {order.loggedBy.name}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-600">
                  {t(`filters.${order.requestedCategory}`)}
                  {order.requestedListingType && (
                    <span className="text-ink-400"> · {t(`filters.for${order.requestedListingType === "sale" ? "Sale" : "Rent"}`)}</span>
                  )}
                </td>
                <td className="max-w-[220px] px-4 py-3 text-ink-500">
                  <p className="line-clamp-2">{order.notes || "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus)}
                    className={`rounded-full border-0 px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${STATUS_STYLES[order.status]}`}
                  >
                    <option value="pending">{t("orders.statusPending")}</option>
                    <option value="contacted">{t("orders.statusContacted")}</option>
                    <option value="fulfilled">{t("orders.statusFulfilled")}</option>
                    <option value="cancelled">{t("orders.statusCancelled")}</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-ink-400">{formatDate(order.updatedAt, locale)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/dashboard/orders/${order._id}/edit`} className="btn-secondary px-3 py-1.5 text-xs">
                      {t("common.edit")}
                    </Link>
                    {isAdmin && (
                      <button
                        onClick={() => setPendingDeleteId(order._id)}
                        className="btn-danger px-3 py-1.5 text-xs"
                      >
                        {t("common.delete")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title={t("orders.confirmDeleteTitle")}
        description={t("orders.confirmDeleteDesc")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </>
  );
}
