"use client";

import type { ListingFormState } from "@/lib/forms/useListingFormState";

export function TenantFields({
  form,
  update,
  t,
}: {
  form: ListingFormState;
  update: <K extends keyof ListingFormState>(key: K, value: ListingFormState[K]) => void;
  t: (key: string) => string;
}) {
  return (
    <section>
      <h3 className="font-display text-base font-semibold text-ink-800">{t("form.tenantSection")}</h3>
      <p className="mt-1 text-sm text-ink-400">{t("form.tenantHint")}</p>
      <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <label className="label-field" htmlFor="tenantName">{t("form.tenantName")}</label>
          <input
            id="tenantName"
            className="input-field"
            value={form.tenantName}
            onChange={(e) => update("tenantName", e.target.value)}
          />
        </div>
        <div>
          <label className="label-field" htmlFor="tenantIdNumber">{t("form.tenantIdNumber")}</label>
          <input
            id="tenantIdNumber"
            className="input-field"
            value={form.tenantIdNumber}
            onChange={(e) => update("tenantIdNumber", e.target.value)}
          />
        </div>
        <div>
          <label className="label-field" htmlFor="tenantPhone">{t("form.tenantPhone")}</label>
          <input
            id="tenantPhone"
            className="input-field"
            value={form.tenantPhone}
            onChange={(e) => update("tenantPhone", e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}
