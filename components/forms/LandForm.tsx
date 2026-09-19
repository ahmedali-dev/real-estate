"use client";

import type { PropertyDTO } from "@/types/property";
import { useListingFormState } from "@/lib/forms/useListingFormState";
import { OwnerFields } from "@/components/forms/fields/OwnerFields";
import { LocationFields } from "@/components/forms/fields/LocationFields";
import { ImagesAndVideoFields } from "@/components/forms/fields/ImagesAndVideoFields";
import { VisibilityField } from "@/components/forms/fields/VisibilityField";

export function LandForm({ property }: { property?: PropertyDTO }) {
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
  } = useListingFormState("land", property);

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
            placeholder={t("form.titlePlaceholderLand")}
            required
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        <div>
          <label className="label-field">{t("form.listingType")}</label>
          <input className="input-field" value={t("form.saleOnly")} disabled />
          <p className="mt-1.5 text-xs text-ink-400">{t("form.saleOnlyNote")}</p>
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
            onChange={(e) => update("status", e.target.value as "available" | "sold")}
          >
            <option value="available">{t("badges.status.available")}</option>
            <option value="sold">{t("badges.status.sold")}</option>
          </select>
          <p className="mt-1.5 text-xs text-ink-400">{t("form.availabilityNoteSale")}</p>
          {errors.status && <p className="field-error">{errors.status}</p>}
        </div>

        <VisibilityField form={form} update={update} t={t} />

        <div className="sm:col-span-2">
          <label className="label-field" htmlFor="description">{t("form.description")}</label>
          <textarea
            id="description"
            className="input-field min-h-[120px]"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder={t("form.descriptionPlaceholderLand")}
            required
          />
          {errors.description && <p className="field-error">{errors.description}</p>}
        </div>
      </section>

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
