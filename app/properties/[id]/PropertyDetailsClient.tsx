"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CategoryBadge } from "@/components/properties/CategoryBadge";
import { ListingTypeBadge } from "@/components/properties/ListingTypeBadge";
import { StatusBadge } from "@/components/properties/StatusBadge";
import { ResidencyBadge } from "@/components/properties/ResidencyBadge";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { fetchProperty, deleteProperty, ApiClientError } from "@/lib/api-client";
import { formatDate, formatLocation, formatPriceWithPeriod } from "@/lib/format";
import type { PropertyDTO } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useSession } from "next-auth/react";
import { OFFICE_PHONE_NUMBERS, officeWhatsAppLink, officeCallLink } from "@/lib/config/office";

export default function PropertyDetailsClient() {
  const { t, locale } = useLanguage();
  const { data: session } = useSession();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<PropertyDTO | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ready">("loading");
  const [activeImage, setActiveImage] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setStatus("loading");
    try {
      const res = await fetchProperty(params.id);
      setProperty(res.data);
      setActiveImage(0);
      setStatus("ready");
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setStatus("notfound");
      } else {
        setStatus("error");
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteProperty(params.id);
      router.push("/");
      router.refresh();
    } catch {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-5xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 h-8 w-2/3 rounded bg-stone-200" />
        <div className="aspect-video w-full rounded-lg bg-stone-200" />
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-semibold text-ink-800">{t("property.notFoundTitle")}</h1>
        <p className="mt-2 text-ink-500">{t("property.notFoundDesc")}</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">{t("property.backToListings")}</Link>
      </div>
    );
  }

  if (status === "error" || !property) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState onRetry={load} />
      </div>
    );
  }

  const images = property.images.length > 0 ? property.images : [];
  const propertyUrl = typeof window !== "undefined" ? window.location.href : "";
  const details = property.details;
  const hasAnyDetail =
    details &&
    (details.rooms != null ||
      details.bathrooms != null ||
      details.hasKitchen != null ||
      details.kitchenCabinetsInstalled != null ||
      details.residencyType != null);
  const units = property.units ?? [];

  function yesNo(value?: boolean) {
    return value ? t("property.hasKitchenYes") : t("property.hasKitchenNo");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm font-medium text-ink-400 hover:text-ink-700">
        {locale === "ar" ? "→" : "←"} {t("property.backToListings")}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CategoryBadge category={property.category} />
            <ListingTypeBadge listingType={property.listingType} />
            <StatusBadge status={property.status} />
            {session?.user && property.details?.residencyType && (
              <ResidencyBadge residencyType={property.details.residencyType} />
            )}
            {session?.user && property.visibility === "private" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-800 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-stone-50">
                {t("form.visibilityPrivate")}
              </span>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold text-ink-800">
            {property.title}
          </h1>
          <p className="mt-1 text-ink-400">{formatLocation(property.location, t)}</p>
        </div>
        {session?.user && (
          <div className="flex gap-2">
            <Link href={`/dashboard/${property._id}/edit`} className="btn-secondary">
              {t("common.edit")}
            </Link>
            {session.user.role === "admin" && (
              <button className="btn-danger" onClick={() => setConfirmOpen(true)}>
                {t("common.delete")}
              </button>
            )}
          </div>
        )}
      </div>

      {images.length > 0 ? (
        <div className="mt-6">
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-stone-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[activeImage]}
              alt={property.title}
              className="h-full w-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={img + idx}
                  onClick={() => setActiveImage(idx)}
                  className={`h-16 w-24 flex-shrink-0 overflow-hidden rounded-md border-2 ${
                    idx === activeImage ? "border-ink-800" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 flex aspect-video w-full items-center justify-center rounded-lg bg-stone-200 text-ink-300">
          <span className="font-display italic">{t("property.noImages")}</span>
        </div>
      )}

      {property.tiktokUrl && (
        <div className="mt-4">
          <a
            href={property.tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex"
          >
            {t("property.watchOnTikTok")}
          </a>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-display text-xl font-semibold text-ink-800">{t("property.description")}</h2>
          <p className="mt-3 whitespace-pre-line text-ink-600">{property.description}</p>

          <h2 className="mt-8 font-display text-xl font-semibold text-ink-800">{t("property.details")}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-4 rounded-lg border border-ink-100 bg-white p-5 shadow-card sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-400">{t("property.category")}</dt>
              <dd className="mt-1 font-medium text-ink-800">{t(`badges.category.${property.category}`)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-400">{t("property.status")}</dt>
              <dd className="mt-1 font-medium text-ink-800">
                {property.listingType === "sale" ? t("property.forSale") : t("property.forRent")}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-400">{t("property.availability")}</dt>
              <dd className="mt-1 font-medium text-ink-800">{t(`badges.status.${property.status}`)}</dd>
            </div>
            {property.listingType === "rent" && property.rentalPeriod && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-400">{t("property.rentalPeriod")}</dt>
                <dd className="mt-1 font-medium text-ink-800">
                  {property.rentalPeriod === "monthly" ? t("form.monthly") : t("form.yearly")}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-400">{t("property.listed")}</dt>
              <dd className="mt-1 font-medium text-ink-800">{formatDate(property.createdAt, locale)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-400">{t("property.updated")}</dt>
              <dd className="mt-1 font-medium text-ink-800">{formatDate(property.updatedAt, locale)}</dd>
            </div>
            {property.location?.address && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-xs uppercase tracking-wide text-ink-400">{t("property.address")}</dt>
                <dd className="mt-1 font-medium text-ink-800">{property.location.address}</dd>
              </div>
            )}
          </dl>

          {hasAnyDetail && (
            <>
              <h2 className="mt-8 font-display text-xl font-semibold text-ink-800">
                {t("property.rooms")} &amp; {t("property.kitchen")}
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-4 rounded-lg border border-ink-100 bg-white p-5 shadow-card sm:grid-cols-4">
                {details?.rooms != null && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-400">{t("property.rooms")}</dt>
                    <dd className="mt-1 font-medium text-ink-800">{details.rooms}</dd>
                  </div>
                )}
                {details?.bathrooms != null && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-400">{t("property.bathrooms")}</dt>
                    <dd className="mt-1 font-medium text-ink-800">{details.bathrooms}</dd>
                  </div>
                )}
                {details?.hasKitchen != null && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-400">{t("property.kitchen")}</dt>
                    <dd className="mt-1 font-medium text-ink-800">{yesNo(details.hasKitchen)}</dd>
                  </div>
                )}
                {details?.kitchenCabinetsInstalled != null && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-400">
                      {t("property.kitchenCabinetsInstalled")}
                    </dt>
                    <dd className="mt-1 font-medium text-ink-800">{yesNo(details.kitchenCabinetsInstalled)}</dd>
                  </div>
                )}
                {session?.user && details?.residencyType && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-400">{t("form.residencyType")}</dt>
                    <dd className="mt-1 font-medium text-ink-800">
                      {t(`form.residencyType${details.residencyType === "family" ? "Family" : details.residencyType === "singles" ? "Singles" : "WomenOnly"}`)}
                    </dd>
                  </div>
                )}
              </dl>
            </>
          )}

          {property.category === "build" && units.length > 0 && (
            <>
              <h2 className="mt-8 font-display text-xl font-semibold text-ink-800">
                {t("property.unitsSection")}
              </h2>
              <div className="mt-3 space-y-3">
                {units.map((unit, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-ink-100 bg-white p-5 shadow-card"
                  >
                    <p className="font-display font-semibold text-ink-800">
                      {unit.name?.trim() || `${t("property.unit")} ${idx + 1}`}
                      {unit.number?.trim() && (
                        <span className="ms-2 font-body text-sm font-normal text-ink-400">
                          #{unit.number.trim()}
                        </span>
                      )}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {unit.rooms != null && (
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-ink-400">{t("property.rooms")}</dt>
                          <dd className="mt-1 font-medium text-ink-800">{unit.rooms}</dd>
                        </div>
                      )}
                      {unit.bathrooms != null && (
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-ink-400">{t("property.bathrooms")}</dt>
                          <dd className="mt-1 font-medium text-ink-800">{unit.bathrooms}</dd>
                        </div>
                      )}
                      {unit.hasKitchen != null && (
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-ink-400">{t("property.kitchen")}</dt>
                          <dd className="mt-1 font-medium text-ink-800">{yesNo(unit.hasKitchen)}</dd>
                        </div>
                      )}
                      {unit.kitchenCabinetsInstalled != null && (
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-ink-400">
                            {t("property.kitchenCabinetsInstalled")}
                          </dt>
                          <dd className="mt-1 font-medium text-ink-800">{yesNo(unit.kitchenCabinetsInstalled)}</dd>
                        </div>
                      )}
                      {session?.user && unit.residencyType && (
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-ink-400">{t("form.residencyType")}</dt>
                          <dd className="mt-1 font-medium text-ink-800">
                            {t(`form.residencyType${unit.residencyType === "family" ? "Family" : unit.residencyType === "singles" ? "Singles" : "WomenOnly"}`)}
                          </dd>
                        </div>
                      )}
                      {session?.user && unit.electricityNumber && (
                        <div className="col-span-2">
                          <dt className="text-xs uppercase tracking-wide text-ink-400">
                            {t("property.electricityNumber")}
                          </dt>
                          <dd className="mt-1 font-medium text-ink-800">{unit.electricityNumber}</dd>
                        </div>
                      )}
                    </dl>
                    {session?.user && property.listingType === "rent" && unit.tenant && (
                      <div className="mt-4 border-t border-ink-100 pt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                          {t("property.tenantSection")}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
                          {unit.tenant.name && (
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-ink-400">
                                {t("form.tenantName")}
                              </dt>
                              <dd className="mt-1 font-medium text-ink-800">{unit.tenant.name}</dd>
                            </div>
                          )}
                          {unit.tenant.phone && (
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-ink-400">
                                {t("form.tenantPhone")}
                              </dt>
                              <dd className="mt-1 font-medium text-ink-800">{unit.tenant.phone}</dd>
                            </div>
                          )}
                          {unit.tenant.idNumber && (
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-ink-400">
                                {t("property.tenantIdNumber")}
                              </dt>
                              <dd className="mt-1 font-medium text-ink-800">{unit.tenant.idNumber}</dd>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="h-fit rounded-lg border border-ink-100 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{t("property.price")}</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink-800">
            {formatPriceWithPeriod(property.price, property.listingType, property.rentalPeriod, t)}
          </p>

          <div className="mt-5 border-t border-ink-100 pt-5">
            {session?.user ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{t("property.ownerContact")}</p>
                {property.owner ? (
                  <>
                    <p className="mt-2 font-medium text-ink-800">{property.owner.name}</p>
                    <p className="mt-1 text-sm text-ink-600">{property.owner.phone}</p>
                    {property.owner.email && (
                      <p className="mt-1 text-sm text-ink-600">{property.owner.email}</p>
                    )}
                    {property.owner.notes && (
                      <p className="mt-2 text-sm text-ink-400">{property.owner.notes}</p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-ink-400">{t("property.ownerNotProvided")}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  {t("property.contactOffice")}
                </p>
                <p className="mt-1 text-xs text-ink-400">{t("property.contactOfficeHint")}</p>
                <div className="mt-3 space-y-2">
                  {OFFICE_PHONE_NUMBERS.map((number) => (
                    <div key={number} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-ink-700" dir="ltr">
                        {number}
                      </span>
                      <div className="flex gap-2">
                        <a
                          href={officeWhatsAppLink(number, `${property.title}\n${propertyUrl}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          {t("property.whatsapp")}
                        </a>
                        <a href={officeCallLink(number)} className="btn-secondary px-3 py-1.5 text-xs">
                          {t("property.call")}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {session?.user && property.listingType === "rent" && property.tenant && (
            <div className="mt-5 border-t border-ink-100 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                {t("property.tenantSection")}
              </p>
              {property.tenant.name && (
                <p className="mt-2 font-medium text-ink-800">{property.tenant.name}</p>
              )}
              {property.tenant.phone && (
                <p className="mt-1 text-sm text-ink-600">{property.tenant.phone}</p>
              )}
              {property.tenant.idNumber && (
                <p className="mt-1 text-sm text-ink-600">
                  {t("property.tenantIdNumber")}: {property.tenant.idNumber}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t("states.confirmDeleteTitle")}
        description={t("states.confirmDeleteDesc")}
        confirmLabel={t("states.confirmDeleteButton")}
        cancelLabel={t("common.cancel")}
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
