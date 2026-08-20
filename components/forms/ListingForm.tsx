"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PropertyDTO, Category, ListingType, RentalPeriod, ListingStatus } from "@/types/property";
import { statusOptionsFor } from "@/types/property";
import { ApiClientError, createProperty, updateProperty, fetchTikTokCover } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface UnitFormState {
  label: string;
  rooms: string;
  bathrooms: string;
  hasKitchen: boolean;
  kitchenCabinetsInstalled: boolean;
  electricityNumber: string;
}

interface FormState {
  title: string;
  category: Category;
  listingType: ListingType;
  price: string;
  rentalPeriod: RentalPeriod | "";
  status: ListingStatus;
  description: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  ownerNotes: string;
  city: string;
  district: string;
  address: string;
  images: string[];
  tiktokUrl: string;
  rooms: string;
  bathrooms: string;
  hasKitchen: boolean;
  kitchenCabinetsInstalled: boolean;
  units: UnitFormState[];
}

function emptyUnit(): UnitFormState {
  return {
    label: "",
    rooms: "",
    bathrooms: "",
    hasKitchen: false,
    kitchenCabinetsInstalled: false,
    electricityNumber: "",
  };
}

function initialState(property?: PropertyDTO): FormState {
  if (!property) {
    return {
      title: "",
      category: "apartment",
      listingType: "sale",
      price: "",
      rentalPeriod: "",
      status: "available",
      description: "",
      ownerName: "",
      ownerPhone: "",
      ownerEmail: "",
      ownerNotes: "",
      city: "",
      district: "",
      address: "",
      images: [],
      tiktokUrl: "",
      rooms: "",
      bathrooms: "",
      hasKitchen: false,
      kitchenCabinetsInstalled: false,
      units: [],
    };
  }
  return {
    title: property.title,
    category: property.category,
    listingType: property.listingType,
    price: String(property.price),
    rentalPeriod: property.rentalPeriod ?? "",
    status: property.status,
    description: property.description,
    ownerName: property.owner?.name ?? "",
    ownerPhone: property.owner?.phone ?? "",
    ownerEmail: property.owner?.email ?? "",
    ownerNotes: property.owner?.notes ?? "",
    city: property.location?.city ?? "",
    district: property.location?.district ?? "",
    address: property.location?.address ?? "",
    images: property.images,
    tiktokUrl: property.tiktokUrl ?? "",
    rooms: property.details?.rooms != null ? String(property.details.rooms) : "",
    bathrooms: property.details?.bathrooms != null ? String(property.details.bathrooms) : "",
    hasKitchen: property.details?.hasKitchen ?? false,
    kitchenCabinetsInstalled: property.details?.kitchenCabinetsInstalled ?? false,
    units: (property.units ?? []).map((u) => ({
      label: u.label ?? "",
      rooms: u.rooms != null ? String(u.rooms) : "",
      bathrooms: u.bathrooms != null ? String(u.bathrooms) : "",
      hasKitchen: u.hasKitchen ?? false,
      kitchenCabinetsInstalled: u.kitchenCabinetsInstalled ?? false,
      electricityNumber: u.electricityNumber ?? "",
    })),
  };
}

export function ListingForm({ property }: { property?: PropertyDTO }) {
  const { t } = useLanguage();
  const router = useRouter();
  const isEdit = Boolean(property);
  const [form, setForm] = useState<FormState>(() => initialState(property));
  const [imageUrl, setImageUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [coverStatus, setCoverStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [coverMessage, setCoverMessage] = useState<string | null>(null);

  const isLand = form.category === "land";
  const isBuild = form.category === "build";

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Enforce the business rule live in the UI: land is always sale-only.
      if (key === "category" && value === "land") {
        next.listingType = "sale";
        next.rentalPeriod = "";
        if (next.status === "rented") next.status = "available";
      }
      if (key === "listingType" && value === "sale") {
        next.rentalPeriod = "";
        if (next.status === "rented") next.status = "available";
      }
      if (key === "listingType" && value === "rent") {
        if (next.status === "sold") next.status = "available";
      }
      return next;
    });
  }

  function updateUnit<K extends keyof UnitFormState>(idx: number, key: K, value: UnitFormState[K]) {
    setForm((prev) => ({
      ...prev,
      units: prev.units.map((u, i) => (i === idx ? { ...u, [key]: value } : u)),
    }));
  }

  function addUnit() {
    setForm((prev) => ({ ...prev, units: [...prev.units, emptyUnit()] }));
  }

  function removeUnit(idx: number) {
    setForm((prev) => ({ ...prev, units: prev.units.filter((_, i) => i !== idx) }));
  }

  function addImage() {
    const url = imageUrl.trim();
    if (!url) return;
    setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
    setImageUrl("");
  }

  function removeImage(idx: number) {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  }

  async function handleFetchCover() {
    const url = form.tiktokUrl.trim();
    if (!url) return;
    setCoverStatus("loading");
    setCoverMessage(null);
    try {
      const result = await fetchTikTokCover(url);
      setForm((prev) => ({
        ...prev,
        images: [result.data.thumbnailUrl, ...prev.images.filter((img) => img !== result.data.thumbnailUrl)],
      }));
      setCoverStatus("success");
      setCoverMessage(t("form.coverFetched"));
    } catch (err) {
      setCoverStatus("error");
      setCoverMessage(err instanceof ApiClientError ? err.message : t("form.coverFetchError"));
    }
  }

  const payload = useMemo(() => {
    const hasOwnerInfo = Boolean(
      form.ownerName.trim() || form.ownerPhone.trim() || form.ownerEmail.trim() || form.ownerNotes.trim()
    );
    const hasLocationInfo = Boolean(form.city.trim() || form.district.trim() || form.address.trim());

    return {
      title: form.title,
      category: form.category,
      listingType: form.listingType,
      description: form.description,
      price: form.price,
      rentalPeriod: form.listingType === "rent" ? form.rentalPeriod || undefined : undefined,
      status: form.status,
      owner: hasOwnerInfo
        ? {
            name: form.ownerName,
            phone: form.ownerPhone,
            email: form.ownerEmail || undefined,
            notes: form.ownerNotes || undefined,
          }
        : undefined,
      location: hasLocationInfo
        ? {
            city: form.city,
            district: form.district || undefined,
            address: form.address || undefined,
          }
        : undefined,
      details: isLand
        ? undefined
        : {
            rooms: form.rooms !== "" ? Number(form.rooms) : undefined,
            bathrooms: form.bathrooms !== "" ? Number(form.bathrooms) : undefined,
            hasKitchen: form.hasKitchen,
            kitchenCabinetsInstalled: form.kitchenCabinetsInstalled,
          },
      units: isBuild
        ? form.units.map((u) => ({
            label: u.label.trim() || undefined,
            rooms: u.rooms !== "" ? Number(u.rooms) : undefined,
            bathrooms: u.bathrooms !== "" ? Number(u.bathrooms) : undefined,
            hasKitchen: u.hasKitchen,
            kitchenCabinetsInstalled: u.kitchenCabinetsInstalled,
            electricityNumber: u.electricityNumber.trim() || undefined,
          }))
        : [],
      images: form.images,
      tiktokUrl: form.tiktokUrl.trim() || undefined,
    };
  }, [form, isLand, isBuild]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});
    setSubmitting(true);
    try {
      const result = isEdit
        ? await updateProperty(property!._id, payload)
        : await createProperty(payload);
      router.push(`/properties/${result.data._id}`);
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
    <form onSubmit={handleSubmit} className="space-y-8">
      {submitError && (
        <div className="rounded-md border border-rust-500/30 bg-rust-50 px-4 py-3 text-sm text-rust-600">
          {submitError}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label-field" htmlFor="title">{t("form.titleLabel")}</label>
          <input
            id="title"
            className="input-field"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={t("form.titlePlaceholder")}
            required
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        <div>
          <label className="label-field" htmlFor="category">{t("form.category")}</label>
          <select
            id="category"
            className="input-field"
            value={form.category}
            onChange={(e) => update("category", e.target.value as Category)}
          >
            <option value="build">{t("form.categoryBuild")}</option>
            <option value="apartment">{t("form.categoryApartment")}</option>
            <option value="land">{t("form.categoryLand")}</option>
          </select>
          {errors.category && <p className="field-error">{errors.category}</p>}
        </div>

        <div>
          <label className="label-field" htmlFor="listingType">{t("form.listingType")}</label>
          {isLand ? (
            <div className="flex items-center gap-2">
              <input className="input-field" value={t("form.saleOnly")} disabled />
              <input type="hidden" value="sale" />
            </div>
          ) : (
            <select
              id="listingType"
              className="input-field"
              value={form.listingType}
              onChange={(e) => update("listingType", e.target.value as ListingType)}
            >
              <option value="sale">{t("form.listingTypeSale")}</option>
              <option value="rent">{t("form.listingTypeRent")}</option>
            </select>
          )}
          {isLand && (
            <p className="mt-1.5 text-xs text-ink-400">
              {t("form.saleOnlyNote")}
            </p>
          )}
          {errors.listingType && <p className="field-error">{errors.listingType}</p>}
        </div>

        <div>
          <label className="label-field" htmlFor="price">{t("form.price")}</label>
          <input
            id="price"
            type="number"
            min={0}
            step="0.01"
            className="input-field"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            required
          />
          {errors.price && <p className="field-error">{errors.price}</p>}
        </div>

        <div>
          <label className="label-field" htmlFor="status">{t("form.availability")}</label>
          <select
            id="status"
            className="input-field"
            value={form.status}
            onChange={(e) => update("status", e.target.value as ListingStatus)}
          >
            {statusOptionsFor(form.listingType).map((option) => (
              <option key={option} value={option}>
                {t(`badges.status.${option}`)}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-ink-400">
            {form.listingType === "sale"
              ? t("form.availabilityNoteSale")
              : t("form.availabilityNoteRent")}
          </p>
          {errors.status && <p className="field-error">{errors.status}</p>}
        </div>

        {!isLand && form.listingType === "rent" && (
          <div>
            <label className="label-field" htmlFor="rentalPeriod">{t("form.rentalPeriod")}</label>
            <select
              id="rentalPeriod"
              className="input-field"
              value={form.rentalPeriod}
              onChange={(e) => update("rentalPeriod", e.target.value as RentalPeriod)}
              required
            >
              <option value="">{t("form.selectPeriod")}</option>
              <option value="monthly">{t("form.monthly")}</option>
              <option value="yearly">{t("form.yearly")}</option>
            </select>
            {errors.rentalPeriod && <p className="field-error">{errors.rentalPeriod}</p>}
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="label-field" htmlFor="description">{t("form.description")}</label>
          <textarea
            id="description"
            className="input-field min-h-[120px]"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder={t("form.descriptionPlaceholder")}
            required
          />
          {errors.description && <p className="field-error">{errors.description}</p>}
        </div>
      </section>

      {!isLand && (
        <section>
          <h3 className="font-display text-base font-semibold text-ink-800">
            {t("form.detailsSection")}
          </h3>
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
        </section>
      )}

      {isBuild && (
        <section>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-ink-800">
                {t("form.unitsSection")}
              </h3>
              <p className="mt-1 text-sm text-ink-400">{t("form.unitsHint")}</p>
            </div>
            <button type="button" onClick={addUnit} className="btn-secondary whitespace-nowrap">
              {t("form.addUnit")}
            </button>
          </div>

          {form.units.length === 0 ? (
            <p className="mt-4 text-sm text-ink-400">{t("form.noUnitsYet")}</p>
          ) : (
            <div className="mt-4 space-y-4">
              {form.units.map((unit, idx) => (
                <div key={idx} className="rounded-lg border border-ink-100 bg-stone-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <label className="label-field" htmlFor={`unit-label-${idx}`}>
                        {t("form.unitLabel")}
                      </label>
                      <input
                        id={`unit-label-${idx}`}
                        className="input-field"
                        value={unit.label}
                        onChange={(e) => updateUnit(idx, "label", e.target.value)}
                        placeholder={t("form.unitLabelPlaceholder")}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUnit(idx)}
                      className="mt-6 text-xs font-semibold text-rust-500 hover:underline"
                    >
                      {t("form.removeUnit")}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-4">
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
                    <label className="flex items-center gap-2 pb-2 text-sm text-ink-700">
                      <input
                        type="checkbox"
                        checked={unit.hasKitchen}
                        onChange={(e) => updateUnit(idx, "hasKitchen", e.target.checked)}
                        className="h-4 w-4 rounded border-ink-300"
                      />
                      {t("form.hasKitchen")}
                    </label>
                    <label className="flex items-center gap-2 pb-2 text-sm text-ink-700">
                      <input
                        type="checkbox"
                        checked={unit.kitchenCabinetsInstalled}
                        onChange={(e) => updateUnit(idx, "kitchenCabinetsInstalled", e.target.checked)}
                        className="h-4 w-4 rounded border-ink-300"
                      />
                      {t("form.kitchenCabinetsInstalled")}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

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

      <section>
        <h3 className="font-display text-base font-semibold text-ink-800">{t("form.videoSection")}</h3>
        <p className="mt-1 text-sm text-ink-400">{t("form.videoHint")}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="input-field"
            placeholder={t("form.videoUrlPlaceholder")}
            value={form.tiktokUrl}
            onChange={(e) => {
              update("tiktokUrl", e.target.value);
              setCoverStatus("idle");
              setCoverMessage(null);
            }}
          />
          <button
            type="button"
            onClick={handleFetchCover}
            disabled={!form.tiktokUrl.trim() || coverStatus === "loading"}
            className="btn-secondary whitespace-nowrap"
          >
            {coverStatus === "loading" ? t("form.fetchingCover") : t("form.fetchCover")}
          </button>
        </div>
        {errors.tiktokUrl && <p className="field-error">{errors.tiktokUrl}</p>}
        {coverMessage && (
          <p
            className={`mt-2 text-xs font-medium ${
              coverStatus === "error" ? "text-rust-500" : "text-moss-600"
            }`}
          >
            {coverMessage}
          </p>
        )}
      </section>

      <section>
        <h3 className="font-display text-base font-semibold text-ink-800">{t("form.imagesSection")}</h3>
        <p className="mt-1 text-sm text-ink-400">{t("form.imagesHint")}</p>
        <div className="mt-3 flex gap-2">
          <input
            className="input-field"
            placeholder={t("form.imageUrlPlaceholder")}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addImage();
              }
            }}
          />
          <button type="button" onClick={addImage} className="btn-secondary whitespace-nowrap">
            {t("form.addImage")}
          </button>
        </div>
        {form.images.length > 0 && (
          <ul className="mt-3 space-y-2">
            {form.images.map((url, idx) => (
              <li
                key={`${url}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-md border border-ink-100 bg-stone-50 px-3 py-2 text-sm text-ink-600"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {idx === 0 && (
                    <span className="flex-shrink-0 rounded-full bg-brass-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brass-600">
                      {t("form.coverLabel")}
                    </span>
                  )}
                  <span className="truncate">{url}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="flex-shrink-0 text-xs font-semibold text-rust-500 hover:underline"
                >
                  {t("form.remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
          {submitting ? t("form.saving") : isEdit ? t("form.saveChanges") : t("form.createListing")}
        </button>
      </div>
    </form>
  );
}
