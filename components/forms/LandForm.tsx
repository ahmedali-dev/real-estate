"use client";

import { EditorialListingForm } from "@/components/forms/EditorialListingForm";
import type { PropertyDTO } from "@/types/property";
import { useListingFormState } from "@/lib/forms/useListingFormState";
import { AvailabilityField, PriceField } from "@/components/forms/fields/ListingControls";
import { OfferFields } from "@/components/forms/fields/OfferFields";
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
    <EditorialListingForm form={form} category="land" errors={errors} submitError={submitError} submitting={submitting} isEdit={isEdit} onSubmit={handleSubmit} onCancel={() => router.back()}>
      <div>
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

        <OfferFields form={form} update={update} errors={errors} existingUser={property?.broughtBy} showPropertyType={false} />

        <PriceField form={form} update={update} errors={errors} t={t} />

        <AvailabilityField form={form} update={update} errors={errors} t={t} />

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
      </div>
      <div><p className="text-sm text-ink-500">{t("guided.landDetails")}</p></div>
      <div>
      <LocationFields form={form} update={update} errors={errors} t={t} />
      <OwnerFields form={form} update={update} errors={errors} t={t} />

      </div>
      <div>
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

      </div>
    </EditorialListingForm>
  );
}
