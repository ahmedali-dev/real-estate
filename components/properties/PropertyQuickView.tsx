"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PropertyDTO } from "@/types/property";
import { Icon } from "@/components/ui/Icon";
import { CopyButton } from "@/components/ui/CopyButton";
import { fetchProperty } from "@/lib/api-client";
import { PriceDisplay } from "./PriceDisplay";
import { CategoryBadge } from "./CategoryBadge";
import { StatusBadge } from "./StatusBadge";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatLocation } from "@/lib/format";
import { propertyLocationUrl } from "@/lib/property-share";
import { useSession } from "next-auth/react";

export function PropertyQuickView({ property: initialProperty, onClose }: { property: PropertyDTO; onClose: () => void }) {
  const { t } = useLanguage();
  const [property, setProperty] = useState(initialProperty);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    let active = true;
    fetchProperty(initialProperty._id).then(result => { if (active) setProperty(result.data); }).catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [initialProperty._id]);
  const { data: session } = useSession();
  const dialog = useRef<HTMLDialogElement>(null);
  const [image, setImage] = useState(0);
  const location = propertyLocationUrl(property);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previous; };
  }, []);
  return <dialog ref={dialog} aria-labelledby="quick-view-title" onCancel={event => { event.preventDefault(); onClose(); }} className="property-quick-view">
    <header className="flex items-center justify-between gap-4 border-b border-ink-100 p-4"><span className="text-sm font-semibold">{t("property.quickView")}</span><button type="button" autoFocus onClick={onClose} aria-label={t("common.close")} className="property-icon-action"><Icon name="close" /></button></header>
    {loadFailed && <p role="status" className="px-5 pt-3 text-sm text-ink-500">{t("property.quickViewLoadFailed")}</p>}
    <div className="quick-view-content">
      <div>
        <div className="quick-view-image">{property.images[image] ? <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img decoding="async" loading="eager" src={property.images[image]} alt={property.title} />
        </> : <div className="flex flex-col items-center gap-3 text-ink-400"><Icon name="image" className="h-10 w-10" />{t("property.noImage")}</div>}</div>
        {property.images.length > 1 && <div className="flex flex-wrap gap-2 p-3">{property.images.map((url, index) => <button key={`${url}-${index}`} type="button" aria-label={`${t("property.imageNumber")} ${index + 1}`} aria-pressed={image === index} onClick={() => setImage(index)} className={`h-12 w-16 overflow-hidden rounded-lg border-2 ${image === index ? "border-moss-600" : "border-transparent"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img decoding="async" loading="lazy" src={url} alt="" className="h-full w-full object-contain" />
        </button>)}</div>}
      </div>
      <div className="p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap gap-2"><CategoryBadge category={property.category} propertyType={property.propertyType} /><StatusBadge status={property.status} /></div>
        <h2 id="quick-view-title" dir="auto" className="mb-3 font-display text-2xl text-ink-800">{property.title}</h2>
        <PriceDisplay price={property.price} listingType={property.listingType} rentalPeriod={property.rentalPeriod} />
        <p className="my-4 flex items-center gap-2 text-sm text-ink-500"><Icon name="location" className="h-4 w-4" />{formatLocation(property.location, t)}</p>
        <div className="mb-5 flex flex-wrap gap-3 text-sm text-ink-600">
          {property.category !== "land" && property.details?.rooms != null && <span>{property.details.rooms} {t("property.rooms")}</span>}
          {property.category !== "land" && property.details?.bathrooms != null && <span>{property.details.bathrooms} {t("property.bathrooms")}</span>}
          {property.category === "build" && property.units.length > 0 && <span>{property.units.length} {t("property.unitsSection")}</span>}
        </div>
        <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{t("property.description")}</h3><CopyButton text={property.description} label={t("property.copyDescription")} /></div>
        <p dir="auto" className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-600">{property.description}</p>
        {session?.user && !property.owner && <p className="mt-5 text-sm text-ink-500">{t("property.ownerNotProvided")}</p>}
        {session?.user && property.owner && <div className="mt-5 border-t border-ink-100 pt-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{t("property.ownerContact")}</h3><CopyButton text={[property.owner.name, property.owner.phone, property.owner.email, property.owner.notes].filter(Boolean).join("\n")} label={t("property.copyOwner")} /></div><p className="mt-2 whitespace-pre-line text-sm text-ink-600">{[property.owner.name, property.owner.phone, property.owner.email, property.owner.notes].filter(Boolean).join("\n")}</p></div>}
        {location && <div className="mt-4 flex items-center justify-between gap-2"><a href={location} target="_blank" rel="noopener noreferrer" className="text-sm text-moss-600 underline">{t("property.openLocation")}</a><CopyButton text={location} label={t("property.copyLocation")} /></div>}
        {property.tiktokUrl && <div className="mt-3 flex items-center justify-between gap-2"><a href={property.tiktokUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-moss-600 underline">{t("property.watchOnTikTok")}</a><CopyButton text={property.tiktokUrl} label={t("property.copyTikTok")} /></div>}
      </div>
    </div>
    <footer className="flex justify-end border-t border-ink-100 p-4"><Link href={`/properties/${property._id}`} className="btn-primary" onClick={onClose}>{t("courtyard.viewProperty")}<Icon name="arrow" className="h-4 w-4" /></Link></footer>
  </dialog>;
}
