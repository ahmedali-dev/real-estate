"use client";

import type { ListingFormState } from "@/lib/forms/useListingFormState";
import type { ResidencyType } from "@/types/property";

export function PropertyDetailsFields({
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
      <h3 className="font-display text-base font-semibold text-ink-800">{t("form.detailsSection")}</h3>
      <p className="mt-1 text-sm text-ink-400">{t("form.detailsHint")}</p>
      <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div>
          <label className="label-field" htmlFor="rooms">{t("form.rooms")}</label>
          <input
            id="rooms"
            type="number"
            min={0}
            className="input-field"
            value={form.rooms}
            onChange={(e) => update("rooms", e.target.value)}
          />
        </div>
        <div>
          <label className="label-field" htmlFor="bathrooms">{t("form.bathrooms")}</label>
          <input
            id="bathrooms"
            type="number"
            min={0}
            className="input-field"
            value={form.bathrooms}
            onChange={(e) => update("bathrooms", e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={form.hasKitchen}
            onChange={(e) => update("hasKitchen", e.target.checked)}
            className="h-4 w-4 rounded border-ink-300"
          />
          {t("form.hasKitchen")}
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={form.kitchenCabinetsInstalled}
            onChange={(e) => update("kitchenCabinetsInstalled", e.target.checked)}
            className="h-4 w-4 rounded border-ink-300"
          />
          {t("form.kitchenCabinetsInstalled")}
        </label>
      </div>

      <div className="mt-4">
        <label className="label-field" htmlFor="residencyType">{t("form.residencyType")}</label>
        <select
          id="residencyType"
          className="input-field sm:w-64"
          value={form.residencyType}
          onChange={(e) => update("residencyType", e.target.value as ResidencyType | "")}
        >
          <option value="">{t("form.residencyTypeAny")}</option>
          <option value="family">{t("form.residencyTypeFamily")}</option>
          <option value="singles">{t("form.residencyTypeSingles")}</option>
          <option value="women_only">{t("form.residencyTypeWomenOnly")}</option>
        </select>
        <p className="mt-1.5 text-xs text-ink-400">{t("form.residencyTypeHint")}</p>
      </div>
    </section>
  );
}
