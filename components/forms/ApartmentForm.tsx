"use client";

import type { PropertyDTO, ListingType, RentalPeriod, ListingStatus } from "@/types/property";
import { statusOptionsFor } from "@/types/property";
import { useListingFormState } from "@/lib/forms/useListingFormState";
import { OwnerFields } from "@/components/forms/fields/OwnerFields";
import { LocationFields } from "@/components/forms/fields/LocationFields";
import { TenantFields } from "@/components/forms/fields/TenantFields";
import { PropertyDetailsFields } from "@/components/forms/fields/PropertyDetailsFields";
import { VisibilityField } from "@/components/forms/fields/VisibilityField";
import { ImagesAndVideoFields } from "@/components/forms/fields/ImagesAndVideoFields";

export function ApartmentForm({ property }: { property?: PropertyDTO }) {
  const {
    t,
    router,
    isEdit,
    form,
    update,
    imageUrl,
    setImageUrl,
    addImage,
    removeImage,
    addUploadedImage,
    handleFetchCover,
    coverStatus,
    setCoverStatus,
    coverMessage,
    setCoverMessage,
    errors,
    submitError,
    submitting,
    handleSubmit,
  } = useListingFormState("apartment", property);

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
          <label className="label-field" htmlFor="listingType">{t("form.listingType")}</label>
          <select
            id="listingType"
            className="input-field"
            value={form.listingType}
            onChange={(e) => update("listingType", e.target.value as ListingType)}
          >
            <option value="sale">{t("form.listingTypeSale")}</option>
            <option value="rent">{t("form.listingTypeRent")}</option>
          </select>
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
            {form.listingType === "sale" ? t("form.availabilityNoteSale") : t("form.availabilityNoteRent")}
          </p>
          {errors.status && <p className="field-error">{errors.status}</p>}
        </div>

        <VisibilityField form={form} update={update} t={t} />

        {form.listingType === "rent" && (
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

      <PropertyDetailsFields form={form} update={update} t={t} />

      {form.listingType === "rent" && <TenantFields form={form} update={update} t={t} />}

      <LocationFields form={form} update={update} errors={errors} t={t} />
      <OwnerFields form={form} update={update} errors={errors} t={t} />

      <ImagesAndVideoFields
        form={form}
        update={update}
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        addImage={addImage}
        removeImage={removeImage}
        addUploadedImage={addUploadedImage}
        handleFetchCover={handleFetchCover}
        coverStatus={coverStatus}
        setCoverStatus={setCoverStatus}
        coverMessage={coverMessage}
        setCoverMessage={setCoverMessage}
        errors={errors}
        t={t}
      />

      <div className="flex items-center justify-end gap-3 border-t border-ink-100 pt-6">
        <button type="button" className="btn-secondary" onClick={() => router.back()} disabled={submitting}>
          {t("form.cancel")}
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? t("form.saving") : isEdit ? t("form.saveChanges") : t("form.createListing")}
        </button>
      </div>
    </form>
  );
}
