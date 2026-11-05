"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PropertyQuickEdit, type QuickEditField } from "./PropertyQuickEdit";
import Link from "next/link";
import type { PropertyDTO } from "@/types/property";
import { Icon,type IconName } from "@/components/ui/Icon";
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
  const { t, locale } = useLanguage();
  const tr=(en:string,ar:string)=>locale==="ar"?ar:en;
  const router = useRouter();
  const [editField, setEditField] = useState<QuickEditField | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [property, setProperty] = useState(initialProperty);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry,setRetry]=useState(0);
  const [image, setImage] = useState(0);
  const [failedImage,setFailedImage]=useState<string>();
  useEffect(() => {
    let active = true;setLoaded(false);setLoadFailed(false);
    fetchProperty(initialProperty._id).then(result => { if (active) { setProperty(result.data);setImage(0);setFailedImage(undefined);setLoaded(true); } }).catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [initialProperty._id,retry]);
  const { data: session } = useSession();
  const canEdit = loaded && (session?.user.role === "admin" || session?.user.role === "real_estate_officer" || (session?.user.role === "project_manager" && property.category === "build"));
  function editButton(field: QuickEditField) {
    const labels = { owner:tr("Edit owner information","تعديل بيانات المالك"),description:tr("Edit description","تعديل الوصف"),tiktokUrl:tr("Edit TikTok link","تعديل رابط TikTok"),mapUrl:tr("Edit location","تعديل الموقع"),price:tr("Edit price","تعديل السعر"),status:tr("Edit availability","تعديل حالة التوفر") };
    return canEdit && <button type="button" className="property-icon-action" aria-label={labels[field]} title={labels[field]} onClick={() => setEditField(field)}><Icon name="edit" className="h-4 w-4" /></button>;
  }
  const dialog = useRef<HTMLDialogElement>(null);
  const location = propertyLocationUrl(property);
  const activeImage=property.images[image];
  const owner=loaded?property.owner:undefined;
  const facts:{icon:IconName;value:number|string;label:string}[]=[];
  if(property.category!=="land"){
    if(property.details?.rooms!=null)facts.push({icon:"bed",value:property.details.rooms,label:t("property.rooms")});
    if(property.details?.bathrooms!=null)facts.push({icon:"bath",value:property.details.bathrooms,label:t("property.bathrooms")});
    if(property.category==="build"&&property.units.length)facts.push({icon:"building",value:property.units.length,label:t("property.unitsSection")});
    else if(property.details?.acInstalled)facts.push({icon:"snow",value:tr("Installed","مركّب"),label:tr("Air conditioning","التكييف")});
  }
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previous; };
  }, []);
  function resource(field:"mapUrl"|"tiktokUrl",url:string|null|undefined,icon:IconName,label:string,empty:string,caption:string){
    if(!url&&!canEdit)return null;
    return <div className="focus-drawer-resource"><span className="focus-drawer-resource-icon"><Icon name={icon} className="h-4 w-4" /></span><div className="min-w-0 flex-1">{url?<a href={url} target="_blank" rel="noopener noreferrer" className="focus-drawer-link">{label}</a>:<span className="text-xs text-ink-500">{empty}</span>}<p className="focus-drawer-caption">{caption}</p></div><div className="focus-drawer-actions">{editButton(field)}{url&&<CopyButton text={url} label={t(field==="mapUrl"?"property.copyLocation":"property.copyTikTok")} />}</div></div>;
  }
  return <dialog ref={dialog} dir={locale==="ar"?"rtl":"ltr"} aria-labelledby="quick-view-title" className="property-quick-view property-focus-drawer" onCancel={event=>{event.preventDefault();if(!editField)onClose();}} onClick={event=>{if(event.target===dialog.current&&!editField){const rect=dialog.current.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose();}}}>
    <header className="focus-drawer-header"><span className="flex items-center gap-2 text-sm font-semibold"><Icon name="eye" className="h-4 w-4" />{t("property.quickView")}</span><button type="button" autoFocus onClick={onClose} aria-label={t("common.close")} className="property-icon-action"><Icon name="close" className="h-4 w-4" /></button></header>
    <div className="focus-drawer-scroll">
      {loadFailed&&<p role="status" className="focus-drawer-load-message">{t("property.quickViewLoadFailed")} <button type="button" className="underline" onClick={()=>setRetry(v=>v+1)}>{tr("Retry","إعادة المحاولة")}</button></p>}
      <div className="focus-drawer-cover">{activeImage&&failedImage!==activeImage?<>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={activeImage} decoding="async" loading="eager" src={activeImage} alt={property.title} onError={()=>setFailedImage(activeImage)} />
      </>:<div className="focus-drawer-no-image"><Icon name="image" className="h-8 w-8" /><span>{t("property.noImage")}</span></div>}{property.images.length>0&&<span className="focus-drawer-image-count"><Icon name="image" className="h-3 w-3" />{image+1} / {property.images.length}</span>}</div>
      {property.images.length>1&&<div className="focus-drawer-thumbnails" aria-label={tr("Property images","صور العقار")}>{property.images.map((url,index)=><button key={`${url}-${index}`} type="button" aria-label={`${t("property.imageNumber")} ${index+1}`} aria-pressed={image===index} onClick={()=>{setImage(index);setFailedImage(undefined);}}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img decoding="async" loading="lazy" src={url} alt="" />
      </button>)}</div>}
      <div className="focus-drawer-info">
        <div className="focus-drawer-badges"><CategoryBadge category={property.category} propertyType={property.propertyType} /><StatusBadge status={property.status} />{editButton("status")}</div>
        <h2 id="quick-view-title" dir="auto" className="focus-drawer-title">{property.title}</h2>
        <p className="focus-drawer-location"><Icon name="location" className="h-4 w-4" /><span>{formatLocation(property.location,t)}</span></p>
        <div className="focus-drawer-price"><PriceDisplay price={property.price} listingType={property.listingType} rentalPeriod={property.rentalPeriod} />{editButton("price")}</div>
        {facts.length>0&&<dl className="focus-drawer-facts">{facts.map(fact=><div key={fact.icon}><Icon name={fact.icon} className="h-4 w-4" /><dd>{fact.value}</dd><dt>{fact.label}</dt></div>)}</dl>}
        <details className="focus-drawer-description" open><summary>{t("property.description")}</summary><div className="focus-drawer-actions mt-3 justify-end">{editButton("description")}<CopyButton text={property.description} label={t("property.copyDescription")} /></div><p dir="auto">{property.description}</p></details>
        {session?.user&&<section className="focus-drawer-owner" aria-labelledby="quick-view-owner"><div className="focus-drawer-section-heading"><h3 id="quick-view-owner"><Icon name="user" className="h-4 w-4" />{t("property.ownerContact")}</h3><div className="focus-drawer-actions">{editButton("owner")}{owner&&<CopyButton text={[owner.name,owner.phone,owner.email,owner.notes].filter(Boolean).join("\n")} label={t("property.copyOwner")} />}</div></div>{owner?<><div className="focus-drawer-owner-row"><span className="focus-drawer-avatar" aria-hidden="true">{owner.name.trim().slice(0,1)}</span><div className="min-w-0"><h4 dir="auto">{owner.name}</h4><a href={`tel:${owner.phone}`} dir="ltr">{owner.phone}</a></div></div>{owner.email&&<a className="focus-drawer-owner-email" href={`mailto:${owner.email}`}>{owner.email}</a>}{owner.notes&&<p dir="auto" className="focus-drawer-owner-notes">{owner.notes}</p>}</>:<p className="focus-drawer-caption mt-3" role="status">{loaded?t("property.ownerNotProvided"):loadFailed?tr("Owner information could not be loaded.","تعذر تحميل بيانات المالك."):tr("Loading owner information…","جارٍ تحميل بيانات المالك…")}</p>}</section>}
        {(location||property.tiktokUrl||canEdit)&&<section className="focus-drawer-resources" aria-labelledby="quick-view-links"><h3 id="quick-view-links">{tr("Explore & share","روابط ومشاركة")}</h3>{resource("mapUrl",location,"location",t("property.openLocation"),tr("No location added","الموقع غير مضاف"),"Google Maps")}{resource("tiktokUrl",property.tiktokUrl,"tiktok",t("property.watchOnTikTok"),tr("No TikTok link added","رابط TikTok غير مضاف"),tr("Video link","رابط الفيديو"))}</section>}
      </div>
    </div>
    <footer className="focus-drawer-footer"><Link href={`/properties/${property._id}`} className="btn-primary" onClick={onClose}>{t("courtyard.viewProperty")}<Icon name="arrow" className="h-4 w-4" /></Link></footer>
    {editField&&<PropertyQuickEdit key={editField} property={property} field={editField} onClose={()=>setEditField(null)} onSaved={updated=>{setProperty(updated);router.refresh();}} />}
  </dialog>;
}
