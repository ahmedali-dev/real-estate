"use client";

import { OfferFields } from "@/components/forms/fields/OfferFields";
import { EditorialListingForm } from "@/components/forms/EditorialListingForm";
import type { PropertyDTO } from "@/types/property";
import { useListingFormState } from "@/lib/forms/useListingFormState";
import { RentalPeriodField, AvailabilityField, PriceField, ListingTypeField } from "@/components/forms/fields/ListingControls";
import { OwnerFields } from "@/components/forms/fields/OwnerFields";
import { LocationFields } from "@/components/forms/fields/LocationFields";
import { ImagesAndVideoFields } from "@/components/forms/fields/ImagesAndVideoFields";
import { VisibilityField } from "@/components/forms/fields/VisibilityField";
import { PropertyDetailsFields } from "@/components/forms/fields/PropertyDetailsFields";
import { BuildUnitsForm } from "@/components/forms/BuildUnitsForm";

export function BuildForm({ property }: { property?: PropertyDTO }) {
  const {
    t,
    router,
    isEdit,
    form,
    update,
    setUnits,
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
  } = useListingFormState("build", property);

  return (
    <EditorialListingForm form={form} category="build" errors={errors} submitError={submitError} submitting={submitting} isEdit={isEdit} onSubmit={handleSubmit} onCancel={() => router.back()}>
      <div>
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label-field" htmlFor="title">{t("form.titleLabel")}</label>
          <input
            id="title"
            className="input-field"
            minLength={3}
            maxLength={160}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={t("form.titlePlaceholderBuild")}
            required
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        <OfferFields form={form} update={update} errors={errors} existingUser={property?.broughtBy} showPropertyType={false} />

        <ListingTypeField form={form} update={update} t={t} />

        <PriceField form={form} update={update} errors={errors} t={t} />

        <AvailabilityField form={form} update={update} errors={errors} t={t} />

        <VisibilityField form={form} update={update} t={t} />

        {form.listingType === "rent" && (
          <RentalPeriodField form={form} update={update} errors={errors} t={t} />
        )}

        <div className="sm:col-span-2">
          <label className="label-field" htmlFor="description">{t("form.description")}</label>
          <textarea
            id="description"
            className="input-field min-h-[120px]"
            minLength={10}
            maxLength={5000}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder={t("form.descriptionPlaceholderBuild")}
            required
          />
          {errors.description && <p className="field-error">{errors.description}</p>}
        </div>
      </section>
      </div>
      <div>

      <PropertyDetailsFields form={form} update={update} errors={errors} t={t} />

      <BuildUnitsForm units={form.units} onChange={setUnits} />

      </div>
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
