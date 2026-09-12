"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { ResidencyType } from "@/types/property";

export interface UnitFormState {
  name: string;
  number: string;
  rooms: string;
  bathrooms: string;
  hasKitchen: boolean;
  kitchenCabinetsInstalled: boolean;
  electricityNumber: string;
  residencyType: ResidencyType | "";
  tenantName: string;
  tenantIdNumber: string;
  tenantPhone: string;
}

export function emptyUnit(): UnitFormState {
  return {
    name: "",
    number: "",
    rooms: "",
    bathrooms: "",
    hasKitchen: false,
    kitchenCabinetsInstalled: false,
    electricityNumber: "",
    residencyType: "",
    tenantName: "",
    tenantIdNumber: "",
    tenantPhone: "",
  };
}

/**
 * Dedicated form for a build's individual apartments. Only rendered when
 * the parent listing form's category is "build". The "how many apartments"
 * stepper resizes the list directly — increasing it appends blank
 * apartments, decreasing it removes from the end — so a user can rough out
 * the total count first and then fill each one in below.
 */
export function BuildUnitsForm({
  units,
  onChange,
  listingType,
}: {
  units: UnitFormState[];
  onChange: (units: UnitFormState[]) => void;
  listingType: "sale" | "rent";
}) {
  const { t } = useLanguage();

  function setCount(rawCount: number) {
    const count = Math.max(0, Math.min(200, Math.round(rawCount || 0)));
    if (count === units.length) return;
    if (count > units.length) {
      onChange([...units, ...Array.from({ length: count - units.length }, emptyUnit)]);
    } else {
      onChange(units.slice(0, count));
    }
  }

  function updateUnit<K extends keyof UnitFormState>(idx: number, key: K, value: UnitFormState[K]) {
    onChange(units.map((u, i) => (i === idx ? { ...u, [key]: value } : u)));
  }

  function addUnit() {
    onChange([...units, emptyUnit()]);
  }

  function removeUnit(idx: number) {
    onChange(units.filter((_, i) => i !== idx));
  }

  return (
    <section className="rounded-lg border border-ink-100 bg-stone-50/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-semibold text-ink-800">
            {t("form.unitsSection")}
          </h3>
          <p className="mt-1 text-sm text-ink-400">{t("form.unitsHint")}</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="label-field" htmlFor="units-count">
              {t("form.unitsCountLabel")}
            </label>
            <input
              id="units-count"
              type="number"
              min={0}
              max={200}
              className="input-field w-24"
              value={units.length}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
          <button type="button" onClick={addUnit} className="btn-secondary whitespace-nowrap">
            {t("form.addUnit")}
          </button>
        </div>
      </div>

      {units.length === 0 ? (
        <p className="mt-4 text-sm text-ink-400">{t("form.noUnitsYet")}</p>
      ) : (
        <div className="mt-4 space-y-4">
          {units.map((unit, idx) => (
            <div key={idx} className="rounded-lg border border-ink-100 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  {t("form.apartmentOrdinal")} {idx + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeUnit(idx)}
                  className="text-xs font-semibold text-rust-500 hover:underline"
                >
                  {t("form.removeUnit")}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="label-field" htmlFor={`unit-name-${idx}`}>
                    {t("form.unitName")}
                  </label>
                  <input
                    id={`unit-name-${idx}`}
                    className="input-field"
                    value={unit.name}
                    onChange={(e) => updateUnit(idx, "name", e.target.value)}
                    placeholder={t("form.unitNamePlaceholder")}
                  />
                </div>
                <div>
                  <label className="label-field" htmlFor={`unit-number-${idx}`}>
                    {t("form.unitNumber")}
                  </label>
                  <input
                    id={`unit-number-${idx}`}
                    className="input-field"
                    value={unit.number}
                    onChange={(e) => updateUnit(idx, "number", e.target.value)}
                    placeholder={t("form.unitNumberPlaceholder")}
                  />
                </div>
                <div>
                  <label className="label-field" htmlFor={`unit-rooms-${idx}`}>{t("form.rooms")}</label>
                  <input
                    id={`unit-rooms-${idx}`}
                    type="number"
                    min={0}
                    className="input-field"
                    value={unit.rooms}
                    onChange={(e) => updateUnit(idx, "rooms", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-field" htmlFor={`unit-bathrooms-${idx}`}>{t("form.bathrooms")}</label>
                  <input
                    id={`unit-bathrooms-${idx}`}
                    type="number"
                    min={0}
                    className="input-field"
                    value={unit.bathrooms}
                    onChange={(e) => updateUnit(idx, "bathrooms", e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="label-field" htmlFor={`unit-electricity-${idx}`}>
                    {t("form.electricityNumber")}
                  </label>
                  <input
                    id={`unit-electricity-${idx}`}
                    className="input-field"
                    value={unit.electricityNumber}
                    onChange={(e) => updateUnit(idx, "electricityNumber", e.target.value)}
                    placeholder={t("form.electricityNumberPlaceholder")}
                  />
                </div>
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={unit.hasKitchen}
                    onChange={(e) => updateUnit(idx, "hasKitchen", e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300"
                  />
                  {t("form.hasKitchen")}
                </label>
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={unit.kitchenCabinetsInstalled}
                    onChange={(e) => updateUnit(idx, "kitchenCabinetsInstalled", e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300"
                  />
                  {t("form.kitchenCabinetsInstalled")}
                </label>
              </div>

              <div className="mt-3">
                <label className="label-field" htmlFor={`unit-residency-${idx}`}>
                  {t("form.residencyType")}
                </label>
                <select
                  id={`unit-residency-${idx}`}
                  className="input-field sm:w-64"
                  value={unit.residencyType}
                  onChange={(e) => updateUnit(idx, "residencyType", e.target.value as ResidencyType | "")}
                >
                  <option value="">{t("form.residencyTypeAny")}</option>
                  <option value="family">{t("form.residencyTypeFamily")}</option>
                  <option value="singles">{t("form.residencyTypeSingles")}</option>
                  <option value="women_only">{t("form.residencyTypeWomenOnly")}</option>
                </select>
              </div>

              {listingType === "rent" && (
                <div className="mt-4 border-t border-ink-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    {t("form.tenantSection")}
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="label-field" htmlFor={`unit-tenant-name-${idx}`}>
                        {t("form.tenantName")}
                      </label>
                      <input
                        id={`unit-tenant-name-${idx}`}
                        className="input-field"
                        value={unit.tenantName}
                        onChange={(e) => updateUnit(idx, "tenantName", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label-field" htmlFor={`unit-tenant-id-${idx}`}>
                        {t("form.tenantIdNumber")}
                      </label>
                      <input
                        id={`unit-tenant-id-${idx}`}
                        className="input-field"
                        value={unit.tenantIdNumber}
                        onChange={(e) => updateUnit(idx, "tenantIdNumber", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label-field" htmlFor={`unit-tenant-phone-${idx}`}>
                        {t("form.tenantPhone")}
                      </label>
                      <input
                        id={`unit-tenant-phone-${idx}`}
                        className="input-field"
                        value={unit.tenantPhone}
                        onChange={(e) => updateUnit(idx, "tenantPhone", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
