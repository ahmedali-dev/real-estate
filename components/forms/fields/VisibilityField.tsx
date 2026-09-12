"use client";

import type { ListingFormState } from "@/lib/forms/useListingFormState";
import type { Visibility } from "@/types/property";

export function VisibilityField({
  form,
  update,
  t,
}: {
  form: ListingFormState;
  update: <K extends keyof ListingFormState>(key: K, value: ListingFormState[K]) => void;
  t: (key: string) => string;
}) {
  return (
    <div>
      <label className="label-field" htmlFor="visibility">{t("form.visibility")}</label>
      <select
        id="visibility"
        className="input-field"
        value={form.visibility}
        onChange={(e) => update("visibility", e.target.value as Visibility)}
      >
        <option value="public">{t("form.visibilityPublic")}</option>
        <option value="private">{t("form.visibilityPrivate")}</option>
      </select>
      <p className="mt-1.5 text-xs text-ink-400">
        {form.visibility === "public" ? t("form.visibilityPublicNote") : t("form.visibilityPrivateNote")}
      </p>
    </div>
  );
}
