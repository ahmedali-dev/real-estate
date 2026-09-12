"use client";

import type { ListingFormState } from "@/lib/forms/useListingFormState";

export function OwnerFields({
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
        {t("form.ownerSection")} <span className="font-body text-xs font-normal text-ink-400">{t("form.optionalHint")}</span>
      </h3>
      <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="label-field" htmlFor="ownerName">{t("form.ownerName")}</label>
          <input
            id="ownerName"
            className="input-field"
            value={form.ownerName}
            onChange={(e) => update("ownerName", e.target.value)}
          />
          {errors["owner.name"] && <p className="field-error">{errors["owner.name"]}</p>}
        </div>
        <div>
          <label className="label-field" htmlFor="ownerPhone">{t("form.ownerPhone")}</label>
          <input
            id="ownerPhone"
            className="input-field"
            value={form.ownerPhone}
            onChange={(e) => update("ownerPhone", e.target.value)}
          />
          {errors["owner.phone"] && <p className="field-error">{errors["owner.phone"]}</p>}
        </div>
        <div>
          <label className="label-field" htmlFor="ownerEmail">{t("form.ownerEmail")}</label>
          <input
            id="ownerEmail"
            type="email"
            className="input-field"
            value={form.ownerEmail}
            onChange={(e) => update("ownerEmail", e.target.value)}
          />
          {errors["owner.email"] && <p className="field-error">{errors["owner.email"]}</p>}
        </div>
        <div>
          <label className="label-field" htmlFor="ownerNotes">{t("form.ownerNotes")}</label>
          <input
            id="ownerNotes"
            className="input-field"
            value={form.ownerNotes}
            onChange={(e) => update("ownerNotes", e.target.value)}
            placeholder={t("form.ownerNotesPlaceholder")}
          />
        </div>
      </div>
    </section>
  );
}
