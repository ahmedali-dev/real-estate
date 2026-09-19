"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PropertyDTO,
  Category,
  ListingType,
  RentalPeriod,
  ListingStatus,
  Visibility,
  ResidencyType,
} from "@/types/property";
import { ApiClientError, createProperty, updateProperty, fetchTikTokCover } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { type UnitFormState } from "@/components/forms/BuildUnitsForm";

export interface ListingFormState {
  title: string;
  listingType: ListingType;
  price: string;
  rentalPeriod: RentalPeriod | "";
  status: ListingStatus;
  visibility: Visibility;
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
  residencyType: ResidencyType | "";
  tenantName: string;
  tenantIdNumber: string;
  tenantPhone: string;
  units: UnitFormState[];
}

function initialState(category: Category, property?: PropertyDTO): ListingFormState {
  if (!property) {
    return {
      title: "",
      listingType: "sale",
      price: "",
      rentalPeriod: "",
      status: "available",
      visibility: "public",
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
      residencyType: "",
      tenantName: "",
      tenantIdNumber: "",
      tenantPhone: "",
      units: [],
    };
  }
  return {
    title: property.title,
    listingType: property.listingType,
    price: String(property.price),
    rentalPeriod: property.rentalPeriod ?? "",
    status: property.status,
    visibility: property.visibility,
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
    residencyType: property.details?.residencyType ?? "",
    tenantName: property.tenant?.name ?? "",
    tenantIdNumber: property.tenant?.idNumber ?? "",
    tenantPhone: property.tenant?.phone ?? "",
    units: (property.units ?? []).map((u) => ({
      name: u.name ?? "",
      number: u.number ?? "",
      rooms: u.rooms != null ? String(u.rooms) : "",
      bathrooms: u.bathrooms != null ? String(u.bathrooms) : "",
      hasKitchen: u.hasKitchen ?? false,
      kitchenCabinetsInstalled: u.kitchenCabinetsInstalled ?? false,
      electricityNumber: u.electricityNumber ?? "",
      residencyType: u.residencyType ?? "",
      tenantName: u.tenant?.name ?? "",
      tenantIdNumber: u.tenant?.idNumber ?? "",
      tenantPhone: u.tenant?.phone ?? "",
    })),
  };
}

/**
 * Shared state + submit logic behind the three category-specific listing
 * forms (ApartmentForm, BuildForm, LandForm). The category itself is fixed
 * for the lifetime of one of these forms — there's no "switch category"
 * control anymore, since each category now has its own dedicated form/page.
 */
export function useListingFormState(category: Category, property?: PropertyDTO) {
  const { t } = useLanguage();
  const router = useRouter();
  const isEdit = Boolean(property);
  const isLand = category === "land";
  const isBuild = category === "build";

  const [form, setForm] = useState<ListingFormState>(() => initialState(category, property));
  const [imageUrl, setImageUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [coverStatus, setCoverStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [coverMessage, setCoverMessage] = useState<string | null>(null);

  function update<K extends keyof ListingFormState>(key: K, value: ListingFormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
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

  function setUnits(units: UnitFormState[]) {
    setForm((prev) => ({ ...prev, units }));
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

  function addUploadedImage(url: string) {
    setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
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
    const isRent = form.listingType === "rent";
    const hasTenantInfo = Boolean(
      form.tenantName.trim() || form.tenantIdNumber.trim() || form.tenantPhone.trim()
    );

    return {
      title: form.title,
      category,
      listingType: isLand ? "sale" : form.listingType,
      description: form.description,
      price: form.price,
      rentalPeriod: !isLand && form.listingType === "rent" ? form.rentalPeriod || undefined : undefined,
      status: form.status,
      visibility: form.visibility,
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
            residencyType: form.residencyType || undefined,
          },
      tenant:
        !isLand && isRent && hasTenantInfo
          ? {
              name: form.tenantName || undefined,
              idNumber: form.tenantIdNumber || undefined,
              phone: form.tenantPhone || undefined,
            }
          : undefined,
      units: isBuild
        ? form.units.map((u) => {
            const hasUnitTenantInfo = Boolean(
              u.tenantName.trim() || u.tenantIdNumber.trim() || u.tenantPhone.trim()
            );
            return {
              name: u.name.trim() || undefined,
              number: u.number.trim() || undefined,
              rooms: u.rooms !== "" ? Number(u.rooms) : undefined,
              bathrooms: u.bathrooms !== "" ? Number(u.bathrooms) : undefined,
              hasKitchen: u.hasKitchen,
              kitchenCabinetsInstalled: u.kitchenCabinetsInstalled,
              electricityNumber: u.electricityNumber.trim() || undefined,
              residencyType: u.residencyType || undefined,
              tenant:
                isRent && hasUnitTenantInfo
                  ? {
                      name: u.tenantName || undefined,
                      idNumber: u.tenantIdNumber || undefined,
                      phone: u.tenantPhone || undefined,
                    }
                  : undefined,
            };
          })
        : [],
      images: form.images,
      tiktokUrl: form.tiktokUrl.trim() || undefined,
    };
  }, [form, category, isLand, isBuild]);

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

  return {
    t,
    router,
    isEdit,
    isLand,
    isBuild,
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
  };
}
