"use client";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { useEffect, useRef, useState } from "react";
import { LocationMap } from "./LocationMap";
import { isGoogleMapsUrl } from "@/lib/maps";
import type { PropertyDTO } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export type QuickEditField = "price" | "status" | "tiktokUrl" | "mapUrl";

export function PropertyQuickEdit({ property, field, onClose, onSaved }: { property: PropertyDTO; field: QuickEditField; onClose: () => void; onSaved: (property: PropertyDTO) => void }) {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const labels = { price: ar ? "تعديل السعر" : "Edit price", status: ar ? "تعديل حالة العقار" : "Edit availability", tiktokUrl: ar ? "تعديل رابط TikTok" : "Edit TikTok link", mapUrl: ar ? "تعديل الموقع" : "Edit location" };
  const dialog = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [price, setPrice] = useState(property.price?.toString() || "");
  const [status, setStatus] = useState(property.status);
  const [tiktokUrl, setTikTok] = useState(property.tiktokUrl || "");
  const [mapUrl, setMap] = useState(property.location?.mapUrl || "");
  useEffect(() => {
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (saving.current) return;
    saving.current = true; setBusy(true); setError("");
    const changes: Record<string, unknown> = {};
    if (field === "price" && price !== (property.price?.toString() || "")) changes.price = price.trim() ? Number(price) : null;
    if (field === "status" && status !== property.status) changes.status = status;
    if (field === "tiktokUrl" && tiktokUrl !== (property.tiktokUrl || "")) changes.tiktokUrl = tiktokUrl;
    if (field === "mapUrl" && mapUrl !== (property.location?.mapUrl || "")) changes.mapUrl = mapUrl;
    if (!Object.keys(changes).length) { saving.current = false; setBusy(false); onClose(); return; }
    try {
      const response = await fetch(`/api/properties/${property._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.fieldErrors ? Object.values(result.fieldErrors).join(" ") : result.error);
      onSaved(result.data); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : ar ? "تعذر الحفظ. حاول مجددًا." : "Could not save. Try again."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} dir={ar ? "rtl" : "ltr"} aria-labelledby="quick-edit-title" onCancel={event => { event.preventDefault(); if (!saving.current) onClose(); }} className="w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-ink-100 bg-white p-6 backdrop:bg-ink-900/50">
    <h2 id="quick-edit-title" className="text-xl font-semibold">{labels[field]}</h2>
    <p className="mt-2 border-b border-ink-100 pb-5 text-sm text-ink-500">{property.title}</p>
    <form onSubmit={save} className="mt-5 space-y-4">
      <fieldset disabled={busy} className="space-y-4">
        {field === "price" && <label className="block text-sm">{ar ? "السعر (ر.س) — اختياري" : "Price (SAR) — optional"}<input autoFocus type="number" min="0.01" step="any" value={price} onChange={e => setPrice(e.target.value)} className="input-field mt-2" /></label>}
        {field === "status" && <label className="block text-sm">{ar ? "حالة العقار" : "Availability"}<SelectDropdown autoFocus value={status} onChange={e => setStatus(e.target.value as PropertyDTO["status"])} className="input-field mt-2"><option value="available">{ar ? "متاح" : "Available"}</option>{property.listingType === "rent" ? <option value="rented">{ar ? "مؤجر" : "Rented"}</option> : <option value="sold">{ar ? "مباع" : "Sold"}</option>}</SelectDropdown></label>}
        {field === "tiktokUrl" && <label className="block text-sm">{ar ? "رابط فيديو TikTok" : "TikTok video URL"}<input autoFocus type="url" dir="ltr" value={tiktokUrl} onChange={e => setTikTok(e.target.value)} className="input-field mt-2" /></label>}
        {field === "mapUrl" && <label className="block text-sm">{ar ? "رابط الموقع على خرائط Google" : "Google Maps location URL"}<input autoFocus type="url" dir="ltr" value={mapUrl} onChange={e => setMap(e.target.value)} className="input-field mt-2" /></label>}
        {field === "mapUrl" && <p className="text-xs text-ink-500">{ar ? "الصق رابط الموقع من خرائط Google. ستظهر معاينة الخريطة أدناه." : "Paste the location link from Google Maps. A map preview appears below."}</p>}
        {field === "mapUrl" && mapUrl.trim() && isGoogleMapsUrl(mapUrl.trim()) && <LocationMap url={mapUrl.trim()} />}
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3"><button type="submit" disabled={busy} className="btn-primary">{busy ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ التغييرات" : "Save changes")}</button><button type="button" disabled={busy} onClick={onClose} className="btn-secondary">{ar ? "إلغاء" : "Cancel"}</button></div>
    </form>
  </dialog>;
}
