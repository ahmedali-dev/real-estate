"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { OrderForm } from "@/components/orders/OrderForm";
import { ErrorState } from "@/components/ui/ErrorState";
import { fetchOrder, ApiClientError } from "@/lib/api-client";
import type { OrderDTO } from "@/types/order";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useRequireRole } from "@/lib/auth/useRequireRole";

export default function EditOrderPage() {
  const { t } = useLanguage();
  const { ready } = useRequireRole(["admin", "sales_officer"], "/dashboard");
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ready">("loading");

  async function load() {
    setStatus("loading");
    try {
      const res = await fetchOrder(params.id);
      setOrder(res.data);
      setStatus("ready");
    } catch (err) {
      setStatus(err instanceof ApiClientError && err.status === 404 ? "notfound" : "error");
    }
  }

  useEffect(() => {
    if (!ready) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, ready]);

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-brass-600">
        {t("orders.editEyebrow")}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800">
        {order ? order.customerName : t("orders.editTitle")}
      </h1>

      <div className="mt-8">
        {status === "loading" && (
          <div className="animate-pulse rounded-lg border border-ink-100 bg-white p-8 shadow-card">
            <div className="h-6 w-1/3 rounded bg-stone-200" />
            <div className="mt-4 h-10 w-full rounded bg-stone-200" />
          </div>
        )}
        {status === "notfound" && <p className="text-ink-500">{t("orders.notFound")}</p>}
        {status === "error" && <ErrorState onRetry={load} />}
        {status === "ready" && order && (
          <div className="rounded-lg border border-ink-100 bg-white p-6 shadow-card sm:p-8">
            <OrderForm order={order} />
          </div>
        )}
      </div>
    </div>
  );
}
