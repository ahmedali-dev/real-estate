"use client";

import type { ListingFormState } from "@/lib/forms/useListingFormState";

export function LocationFields({
  form,
  update,
  errors,
  t,
}: {
  form: ListingFormState;
  update: <K extends keyof ListingFormState>(key: K, value: ListingFormState[K]) => void;
  errors: Record<string, string>;
  t: (key: string) => string;
}) {
  return (
    <section>
      <h3 className="font-display text-base font-semibold text-ink-800">
        {t("form.locationSection")} <span className="font-body text-xs font-normal text-ink-400">{t("form.optionalHint")}</span>
      </h3>
      <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <label className="label-field" htmlFor="city">{t("form.city")}</label>
          <input
            id="city"
            className="input-field"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
          />
          {errors["location.city"] && <p className="field-error">{errors["location.city"]}</p>}
        </div>
        <div>
          <label className="label-field" htmlFor="district">{t("form.district")}</label>
          <input
            id="district"
            className="input-field"
            value={form.district}
            onChange={(e) => update("district", e.target.value)}
          />
        </div>
        <div>
          <label className="label-field" htmlFor="address">{t("form.address")}</label>
          <input
            id="address"
            className="input-field"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}
