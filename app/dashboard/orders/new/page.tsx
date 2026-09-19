"use client";

import { OrderForm } from "@/components/orders/OrderForm";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useRequireRole } from "@/lib/auth/useRequireRole";

export default function NewOrderPage() {
  const { t } = useLanguage();
  const { ready } = useRequireRole(["admin", "sales_officer"], "/dashboard");

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-brass-600">
        {t("orders.eyebrow")}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800">
        {t("orders.logOrder")}
      </h1>
      <p className="mt-2 text-ink-500">{t("orders.newSubtitle")}</p>

      <div className="mt-8 rounded-lg border border-ink-100 bg-white p-6 shadow-card sm:p-8">
        <OrderForm />
      </div>
    </div>
  );
}
