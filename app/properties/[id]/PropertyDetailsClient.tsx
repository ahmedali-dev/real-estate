"use client";

import { propertyLocationUrl, propertyShareMessage } from "@/lib/property-share";
import { publicSiteOrigin } from "@/lib/site-url";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CopyButton } from "@/components/ui/CopyButton";
import { Icon } from "@/components/ui/Icon";
import { PriceDisplay } from "@/components/properties/PriceDisplay";
import { WhatsAppSendForm } from "@/components/properties/WhatsAppSendForm";
import { PropertyQuickEdit, type QuickEditField } from "@/components/properties/PropertyQuickEdit";
import { TikTokVideo } from "@/components/properties/TikTokVideo";
import { LocationMap } from "@/components/properties/LocationMap";
import { CategoryBadge } from "@/components/properties/CategoryBadge";
import { ListingTypeBadge } from "@/components/properties/ListingTypeBadge";
import { StatusBadge } from "@/components/properties/StatusBadge";
import { ResidencyBadge } from "@/components/properties/ResidencyBadge";
import { LoadingProperty } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { fetchProperty, deleteProperty, ApiClientError } from "@/lib/api-client";
import { formatDate, formatLocation } from "@/lib/format";
import type { PropertyDTO } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useSession } from "next-auth/react";
import { OFFICE_PHONE_NUMBERS, officeWhatsAppLink, officeCallLink } from "@/lib/config/office";

export default function PropertyDetailsClient({ publicOrigin, initialProperty }: { publicOrigin: string | null; initialProperty?: PropertyDTO }) {
  const { t, locale } = useLanguage();
  const { data: session } = useSession();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const galleryDialog = useRef<HTMLDialogElement>(null);
  const [property, setProperty] = useState<PropertyDTO | null>(initialProperty || null);
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ready">(initialProperty ? "ready" : "loading");
  const [activeImage, setActiveImage] = useState(0);
  const [officeSendOpen, setOfficeSendOpen] = useState(false);
  const [quickEditField, setQuickEditField] = useState<QuickEditField | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setStatus("loading");
    try {
      const res = await fetchProperty(params.id);
      setProperty(res.data);
      setActiveImage(0);
      setOfficeSendOpen(false);
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
    if (initialProperty && initialProperty._id === params.id) { setProperty(initialProperty); setStatus("ready"); setActiveImage(0); setOfficeSendOpen(false); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, initialProperty]);

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

  if (status === "loading") return <LoadingProperty />;

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
  const shareOrigin = publicOrigin || (typeof window !== "undefined" ? publicSiteOrigin(window.location.origin) : null);
  const propertyUrl = shareOrigin ? `${shareOrigin}/properties/${property._id}` : "";
  const locationUrl = propertyLocationUrl(property);
  const shareMessage = propertyShareMessage(property.title, propertyUrl, locationUrl, t("form.locationSection"));
  const details = property.details;
  const hasAnyDetail =
    details &&
    (details.acInstalled != null ||
      details.rooms != null ||
      details.bathrooms != null ||
      details.hasKitchen != null ||
      details.kitchenCabinetsInstalled != null ||
      details.residencyType != null);
  const units = property.units ?? [];
  const canQuickEdit = Boolean(session?.user && ["admin", "real_estate_officer", "project_manager"].includes(session.user.role) && (session.user.role !== "project_manager" || property.category === "build"));
  const editLabel = (field: QuickEditField) => ({ price: locale === "ar" ? "تعديل السعر" : "Edit price", status: locale === "ar" ? "تعديل الحالة" : "Edit availability", tiktokUrl: locale === "ar" ? "تعديل رابط TikTok" : "Edit TikTok link", mapUrl: locale === "ar" ? "تعديل الموقع" : "Edit location" })[field];
  const canSendFromOffice = Boolean(session?.user && ["admin", "real_estate_officer", "project_manager"].includes(session.user.role) &&
    (session.user.role !== "project_manager" || property.category === "build") && property.visibility === "public");

  function yesNo(value?: boolean) {
    return value ? t("property.hasKitchenYes") : t("property.hasKitchenNo");
  }

  return (
    <div className="property-editorial mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-10">
      <Link href="/" className="text-sm font-medium text-ink-400 hover:text-ink-700">
        {locale === "ar" ? "→" : "←"} {t("property.backToListings")}
      </Link>

      <div className="editorial-hero">
        <div>
      {images.length > 0 ? (
        <div className="editorial-gallery">
          <div className={`estate-gallery-grid ${images.length > 1 ? "has-side-images" : ""}`}>
          <div className="editorial-image-stage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[activeImage]}
              alt={property.title}
              className="h-full max-h-[70vh] w-full object-contain"
            />
          </div>
          {images.length > 1 && <div className="estate-gallery-side">{images.slice(1, 3).map((image, index) => <button type="button" key={image + index} aria-label={`${t("property.viewFullImage")} ${index + 2}`} onClick={() => { setActiveImage(index + 1); galleryDialog.current?.showModal(); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={`${property.title} — ${index + 2}`} className="h-full w-full object-contain" />
            {index === Math.min(images.length - 2, 1) && <span><Icon name="image" className="h-4 w-4" />{images.length} {locale === "ar" ? "صور" : "photos"}</span>}
          </button>)}</div>}
          </div>
          <button type="button" className="btn-secondary mt-3 w-full sm:w-auto" onClick={() => galleryDialog.current?.showModal()}>
            <Icon name="image" className="h-4 w-4" />{t("property.viewFullImage")} <span className="text-ink-400">{activeImage + 1} / {images.length}</span>
          </button>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={img + idx}
                  onClick={() => setActiveImage(idx)}
                  aria-label={`${property.title} — ${idx + 1} / ${images.length}`}
                  aria-pressed={idx === activeImage}
                  className={`h-16 w-24 flex-shrink-0 overflow-hidden rounded-md border-2 ${
                    idx === activeImage ? "border-ink-800" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="h-full w-full bg-stone-200 object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="editorial-image-stage estate-empty-gallery text-ink-300">
          <span className="font-display italic">{t("property.noImages")}</span>
        </div>
      )}
</div>
        <div className="editorial-summary">      <div className="editorial-heading">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={property.category} propertyType={property.propertyType} />
            <ListingTypeBadge listingType={property.listingType} />
            {canQuickEdit ? <button type="button" className="inline-edit-trigger rounded-full" aria-label={editLabel("status")} title={editLabel("status")} onClick={() => setQuickEditField("status")}><StatusBadge status={property.status} /><Icon name="edit" className="h-3 w-3" /></button> : <StatusBadge status={property.status} />}
            {session?.user && property.details?.residencyType && (
              <ResidencyBadge residencyType={property.details.residencyType} />
            )}
            {session?.user && property.visibility === "private" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-800 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-stone-50">
                {t("form.visibilityPrivate")}
              </span>
            )}
          </div>
          <h1 className="editorial-title">
            {property.title}
          </h1>
          <div className="mt-3 flex items-center gap-2 text-sm text-ink-500"><Icon name="location" className="h-4 w-4" />{canQuickEdit ? <button type="button" className="inline-edit-trigger rounded-lg px-2 py-1" aria-label={editLabel("mapUrl")} onClick={() => setQuickEditField("mapUrl")}>{locationUrl && !property.location?.city && !property.location?.district ? t("form.locationSection") : formatLocation(property.location, t)}<Icon name="edit" className="h-3 w-3" /></button> : <span>{locationUrl && !property.location?.city && !property.location?.district ? t("form.locationSection") : formatLocation(property.location, t)}</span>}</div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={t("property.actions")}>
          {locationUrl && <a href={locationUrl} target="_blank" rel="noopener noreferrer" className="property-icon-action" data-tooltip={t("property.openLocation")} aria-label={t("property.openLocation")}><Icon name="location" /></a>}
          {propertyUrl ? <a href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`} target="_blank" rel="noopener noreferrer" className="property-icon-action" data-tooltip={t("property.shareWhatsApp")} aria-label={t("property.shareWhatsApp")}><Icon name="share" /></a> :
            <button type="button" className="property-icon-action" disabled data-tooltip={t("property.shareNeedsPublicUrl")} aria-label={t("property.shareWhatsApp")}><Icon name="share" /></button>}
          {property.tiktokUrl && <a href={property.tiktokUrl} target="_blank" rel="noopener noreferrer" className="property-icon-action" data-tooltip={t("property.watchOnTikTok")} aria-label={t("property.watchOnTikTok")}><Icon name="tiktok" /></a>}
          {canSendFromOffice && <button type="button" className="property-icon-action property-icon-whatsapp" data-tooltip={t("property.sendViaOffice")} aria-label={t("property.sendViaOffice")} aria-expanded={officeSendOpen} aria-controls="whatsapp-send-panel" onClick={() => setOfficeSendOpen(!officeSendOpen)}><Icon name="whatsapp" /></button>}
          {quickEditField && <PropertyQuickEdit key={quickEditField} field={quickEditField} property={property} onClose={() => setQuickEditField(null)} onSaved={updated => { setProperty(updated); router.refresh(); }} />}
          {session?.user && <>
            <Link href={`/dashboard/${property._id}/edit`} className="property-icon-action" data-tooltip={t("common.edit")} aria-label={t("common.edit")}><Icon name="edit" /></Link>
            {session.user.role === "admin" && <button type="button" className="property-icon-action property-icon-delete" data-tooltip={t("common.delete")} aria-label={t("common.delete")} onClick={() => setConfirmOpen(true)}><Icon name="trash" /></button>}
          </>}
        </div>
      </div>

          <dl className="editorial-facts">
            <div><dt><Icon name={property.category === "build" ? "building" : property.category === "land" ? "land" : "home"} className="h-5 w-5" />{property.category === "apartment" ? t("offer.propertyType") : t("property.category")}</dt><dd>{property.propertyType ? t(`offer.types.${property.propertyType}`) : t(`badges.category.${property.category}`)}</dd></div>
            <div><dt><Icon name="check" className="h-5 w-5" />{t("property.availability")}</dt><dd>{t(`badges.status.${property.status}`)}</dd></div>
            {property.category !== "land" && details?.rooms != null && <div><dt><Icon name="bed" className="h-5 w-5" />{t("property.rooms")}</dt><dd>{details.rooms}</dd></div>}
            {property.category !== "land" && details?.bathrooms != null && <div><dt><Icon name="bath" className="h-5 w-5" />{t("property.bathrooms")}</dt><dd>{details.bathrooms}</dd></div>}
            {property.category === "build" && units.length > 0 && <div><dt><Icon name="building" className="h-5 w-5" />{t("property.unitsSection")}</dt><dd>{units.length}</dd></div>}
          </dl>

        <aside className="editorial-contact">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500"><Icon name="money" className="h-4 w-4 text-moss-500" />{t("property.price")}</p>
          <div className="mt-3">{canQuickEdit ? <button type="button" className="inline-edit-trigger rounded-xl p-2 -ms-2 text-start" aria-label={editLabel("price")} title={editLabel("price")} onClick={() => setQuickEditField("price")}><PriceDisplay price={property.price} listingType={property.listingType} rentalPeriod={property.rentalPeriod} large /><Icon name="edit" className="h-4 w-4" /></button> : <PriceDisplay price={property.price} listingType={property.listingType} rentalPeriod={property.rentalPeriod} large />}</div>

          <div className="mt-5 border-t border-ink-100 pt-5">
            {session?.user ? (
              <>
                <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{t("property.ownerContact")}</p>{property.owner && <CopyButton label={t("property.copyOwner")} text={[property.owner.name, property.owner.phone, property.owner.email, property.owner.notes].filter(Boolean).join("\n")} />}</div>
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
                          href={officeWhatsAppLink(number, shareMessage)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          <Icon name="phone" className="h-3.5 w-3.5" />{t("property.whatsapp")}
                        </a>
                        <a href={officeCallLink(number)} className="btn-secondary px-3 py-1.5 text-xs">
                          <Icon name="phone" className="h-3.5 w-3.5" />{t("property.call")}
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
      </div>

      {canSendFromOffice && officeSendOpen && <WhatsAppSendForm key={property._id} property={property} publicOrigin={shareOrigin || ""} onClose={() => setOfficeSendOpen(false)} />}

      <div className="editorial-lower">
        <div className="editorial-story">
          <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold text-ink-800">{t("property.description")}</h2><CopyButton label={t("property.copyDescription")} text={property.description} /></div>
          <p className="mt-3 whitespace-pre-line text-ink-600">{property.description}</p>

          <h2 className="mt-8 font-display text-xl font-semibold text-ink-800">{t("property.details")}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-4 rounded-lg border border-ink-100 bg-white p-5 shadow-card sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-400">{t("property.category")}</dt>
              <dd className="mt-1 font-medium text-ink-800">{t(`badges.category.${property.category}`)}</dd>
            </div>
            {property.category === "apartment" && <div>
              <dt className="text-xs uppercase tracking-wide text-ink-400">{t("offer.propertyType")}</dt>
              <dd className="mt-1 font-medium text-ink-800">{t(`offer.types.${property.propertyType ?? "apartment"}`)}</dd>
            </div>}
            {property.category === "build" && units.length > 0 && <div>
              <dt className="text-xs uppercase tracking-wide text-ink-400">{t("property.unitsSection")}</dt>
              <dd className="mt-1 font-medium text-ink-800">{units.length}</dd>
            </div>}
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

          {session?.user && <section className="property-office-record mt-8 rounded-xl border border-ink-100 bg-white p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-800"><Icon name="users" className="h-5 w-5" />{t("property.officeRecord")}</h2>
            <dl className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div><dt className="text-xs uppercase tracking-wide text-ink-400">{t("offer.broughtBy")}</dt><dd className="mt-1 font-medium text-ink-800">{property.broughtBy?.name || t("property.notRecorded")}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-ink-400">{t("form.visibility")}</dt><dd className="mt-1 font-medium text-ink-800">{t(property.visibility === "public" ? "form.visibilityPublic" : "form.visibilityPrivate")}</dd></div>
            </dl>
          </section>}

          {hasAnyDetail && (
            <>
              <h2 className="mt-8 font-display text-xl font-semibold text-ink-800">
                {t("property.rooms")} &amp; {t("property.kitchen")}
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-4 rounded-lg border border-ink-100 bg-white p-5 shadow-card sm:grid-cols-4">
                {details?.rooms != null && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-400"><span className="inline-flex items-center gap-1.5"><Icon name="bed" className="h-4 w-4" />{t("property.rooms")}</span></dt>
                    <dd className="mt-1 font-medium text-ink-800">{details.rooms}</dd>
                  </div>
                )}
                {details?.bathrooms != null && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-400"><span className="inline-flex items-center gap-1.5"><Icon name="bath" className="h-4 w-4" />{t("property.bathrooms")}</span></dt>
                    <dd className="mt-1 font-medium text-ink-800">{details.bathrooms}</dd>
                  </div>
                )}
                {details?.acInstalled != null && (
                  <div><dt className="text-xs uppercase tracking-wide text-ink-400"><span className="inline-flex items-center gap-1.5"><Icon name="snow" className="h-4 w-4" />{t("form.acInstalled")}</span></dt><dd className="mt-1 font-medium text-ink-800">{yesNo(details.acInstalled)}</dd></div>
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
                      {t("property.unit")} {unit.number?.trim() || unit.name?.trim() || idx + 1}
                      <span className={`ms-3 inline-flex rounded-full px-2.5 py-1 font-body text-xs font-semibold ${unit.isRented ? "bg-brass-50 text-brass-600" : "bg-moss-50 text-moss-600"}`}>
                        {t(unit.isRented ? "badges.status.rented" : "badges.status.available")}
                      </span>
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {unit.rooms != null && (
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-ink-400"><span className="inline-flex items-center gap-1.5"><Icon name="bed" className="h-4 w-4" />{t("property.rooms")}</span></dt>
                          <dd className="mt-1 font-medium text-ink-800">{unit.rooms}</dd>
                        </div>
                      )}
                      {unit.bathrooms != null && (
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-ink-400"><span className="inline-flex items-center gap-1.5"><Icon name="bath" className="h-4 w-4" />{t("property.bathrooms")}</span></dt>
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
                    {session?.user && unit.isRented && unit.tenant && (
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
          )}</div>
        <div className="editorial-location">
          {(locationUrl || canQuickEdit) && <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="editorial-section-title"><Icon name="location" className="h-5 w-5" />{t("form.locationSection")}</h2><div className="flex items-center gap-2">{canQuickEdit && <button type="button" onClick={() => setQuickEditField("mapUrl")} className="inline-edit-trigger rounded-lg border border-ink-100 px-3 py-2 text-sm"><Icon name="edit" className="h-4 w-4" />{locationUrl ? editLabel("mapUrl") : locale === "ar" ? "إضافة الموقع" : "Add location"}</button>}{locationUrl && <CopyButton label={t("property.copyLocation")} text={locationUrl} />}</div></div>}
          {locationUrl ? <LocationMap url={locationUrl} /> : canQuickEdit && <button type="button" onClick={() => setQuickEditField("mapUrl")} className="flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-200 bg-stone-50 p-6 text-sm text-ink-500 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2"><Icon name="location" className="h-7 w-7" />{locale === "ar" ? "لم يُضف موقع بعد. اضغط لإضافة رابط خرائط Google." : "No location added yet. Click to add a Google Maps link."}</button>}
          {canQuickEdit && <button type="button" onClick={() => setQuickEditField("tiktokUrl")} className="inline-edit-trigger mt-5 rounded-xl border border-ink-100 px-4 py-3 text-sm"><Icon name="tiktok" className="h-4 w-4" />{property.tiktokUrl ? editLabel("tiktokUrl") : locale === "ar" ? "إضافة رابط TikTok" : "Add TikTok link"}<Icon name="edit" className="h-3 w-3" /></button>}
          {property.tiktokUrl && <div className="mt-5"><TikTokVideo url={property.tiktokUrl} /></div>}
          {property.tiktokUrl && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-4">
            <a href={property.tiktokUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-ink-600 hover:underline"><Icon name="tiktok" className="h-5 w-5" />{t("property.watchOnTikTok")}</a>
            <CopyButton label={t("property.copyTikTok")} text={property.tiktokUrl} />
          </div>}
        </div>
      </div>
      <dialog ref={galleryDialog} className="editorial-lightbox" aria-label={t("property.viewFullImage")}>
        <div className="flex items-center justify-between gap-4 border-b border-ink-100 bg-white p-4"><p>{property.title}</p><button type="button" className="btn-secondary" onClick={() => galleryDialog.current?.close()}>{t("common.close")}</button></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {images[activeImage] && <img src={images[activeImage]} alt={property.title} className="max-h-[80vh] w-full object-contain" />}
      </dialog>

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
