"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderDTO, OrderStatus, RequestedCategory, RequestedListingType } from "@/types/order";
import { ApiClientError, createOrder, updateOrder } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface FormState {
  customerName: string;
  customerPhone: string;
  requestedCategory: RequestedCategory;
  requestedListingType: RequestedListingType | "";
  notes: string;
  status: OrderStatus;
}

function initialState(order?: OrderDTO): FormState {
  if (!order) {
    return {
      customerName: "",
      customerPhone: "",
      requestedCategory: "apartment",
      requestedListingType: "",
      notes: "",
      status: "pending",
    };
  }
  return {
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    requestedCategory: order.requestedCategory,
    requestedListingType: order.requestedListingType ?? "",
    notes: order.notes ?? "",
    status: order.status,
  };
}

export function OrderForm({ order }: { order?: OrderDTO }) {
  const { t } = useLanguage();
  const router = useRouter();
  const isEdit = Boolean(order);
  const [form, setForm] = useState<FormState>(() => initialState(order));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLand = form.requestedCategory === "land";

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "requestedCategory" && value === "land") {
        next.requestedListingType = "sale";
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});
    setSubmitting(true);

    const payload = {
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      requestedCategory: form.requestedCategory,
      requestedListingType: form.requestedListingType || undefined,
      notes: form.notes || undefined,
      status: form.status,
    };

    try {
      if (isEdit) {
        await updateOrder(order!._id, payload);
      } else {
        await createOrder(payload);
      }
      router.push("/dashboard/orders");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setSubmitError(err.message);
        if (err.fieldErrors) setErrors(err.fieldErrors);
      } else {
        setSubmitError(t("form.genericError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <div className="rounded-md border border-rust-500/30 bg-rust-50 px-4 py-3 text-sm text-rust-600">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="label-field" htmlFor="customerName">{t("orders.customerName")}</label>
          <input
            id="customerName"
            className="input-field"
            value={form.customerName}
            onChange={(e) => update("customerName", e.target.value)}
            required
          />
          {errors.customerName && <p className="field-error">{errors.customerName}</p>}
        </div>

        <div>
          <label className="label-field" htmlFor="customerPhone">{t("orders.customerPhone")}</label>
          <input
            id="customerPhone"
            className="input-field"
            value={form.customerPhone}
            onChange={(e) => update("customerPhone", e.target.value)}
            required
          />
          {errors.customerPhone && <p className="field-error">{errors.customerPhone}</p>}
        </div>

        <div>
          <label className="label-field" htmlFor="requestedCategory">{t("orders.wants")}</label>
          <select
            id="requestedCategory"
            className="input-field"
            value={form.requestedCategory}
            onChange={(e) => update("requestedCategory", e.target.value as RequestedCategory)}
          >
            <option value="apartment">{t("form.categoryApartment")}</option>
            <option value="build">{t("form.categoryBuild")}</option>
            <option value="land">{t("form.categoryLand")}</option>
          </select>
          {errors.requestedCategory && <p className="field-error">{errors.requestedCategory}</p>}
        </div>

        <div>
          <label className="label-field" htmlFor="requestedListingType">{t("form.listingType")}</label>
          {isLand ? (
            <input className="input-field" value={t("form.saleOnly")} disabled />
          ) : (
            <select
              id="requestedListingType"
              className="input-field"
              value={form.requestedListingType}
              onChange={(e) => update("requestedListingType", e.target.value as RequestedListingType)}
            >
              <option value="">{t("orders.noPreference")}</option>
              <option value="sale">{t("form.listingTypeSale")}</option>
              <option value="rent">{t("form.listingTypeRent")}</option>
            </select>
          )}
        </div>

        {isEdit && (
          <div>
            <label className="label-field" htmlFor="status">{t("orders.status")}</label>
            <select
              id="status"
              className="input-field"
              value={form.status}
              onChange={(e) => update("status", e.target.value as OrderStatus)}
            >
              <option value="pending">{t("orders.statusPending")}</option>
              <option value="contacted">{t("orders.statusContacted")}</option>
              <option value="fulfilled">{t("orders.statusFulfilled")}</option>
              <option value="cancelled">{t("orders.statusCancelled")}</option>
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="label-field" htmlFor="notes">{t("orders.notes")}</label>
          <textarea
            id="notes"
            className="input-field min-h-[100px]"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder={t("orders.notesPlaceholder")}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-ink-100 pt-6">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.back()}
          disabled={submitting}
        >
          {t("form.cancel")}
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? t("form.saving") : isEdit ? t("form.saveChanges") : t("orders.logOrder")}
        </button>
      </div>
    </form>
  );
}
