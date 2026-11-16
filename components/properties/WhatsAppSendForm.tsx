"use client";

import { Icon } from "@/components/ui/Icon";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { propertyTextMessage, propertyVideoCaption } from "@/lib/property-message";
import type { PropertyDTO } from "@/types/property";
import { SegmentedControl } from "@/components/forms/fields/ListingControls";
import { whatsappRecipient } from "@/lib/property-share";

export function WhatsAppSendForm({ property, publicOrigin, onClose }: { property: PropertyDTO; publicOrigin: string; onClose: () => void }) {
  const { t, locale } = useLanguage();
  const [messageLocale, setMessageLocale] = useState<"en" | "ar">(locale);
  const message = propertyTextMessage(property, publicOrigin, messageLocale);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [sent, setSent] = useState(false);
  const [includeVideo, setIncludeVideo] = useState(false);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (busy || sent) return;
    if (!whatsappRecipient(phone)) { setNotice("invalidRecipient"); return; }
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/properties/${property._id}/whatsapp`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, locale: messageLocale, includeVideo }),
      });
      const result = await response.json();
      const allowed = ["openwaSetup", "invalidRecipient", "privateShare", "openwaLicense", "openwaAuth", "openwaNotReady", "openwaPartial", "openwaImage", "videoUnavailable", "videoTooLarge"];
      if (!response.ok) { setNotice(allowed.includes(result.code) ? result.code : "sendFailed"); return; }
      setSent(true); setNotice("sendAccepted");
    } catch { setNotice("sendFailed"); }
    finally { setBusy(false); }
  }

  return <section id="whatsapp-send-panel" aria-label={t("property.sendViaOffice")} className="mt-5 border border-stone-200 bg-white p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-semibold text-ink-800"><Icon name="whatsapp" className="h-5 w-5 text-moss-600" />{t("property.sendViaOffice")}</h2><button type="button" className="property-icon-action" data-tooltip={t("common.close")} aria-label={t("common.close")} disabled={busy} onClick={onClose}><Icon name="close" /></button></div>
    <form id="whatsapp-send-form" onSubmit={send} className="mt-4 grid gap-5 sm:grid-cols-2">
      <div>
        <p className="mb-3 text-sm text-ink-500">{t("property.openwaHint")}</p>
        {property.localVideo && <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-ink-100 bg-stone-50 p-3 text-sm text-ink-700"><input className="mt-0.5 h-4 w-4 accent-moss-600" type="checkbox" checked={includeVideo} disabled={busy || sent} onChange={event => { setIncludeVideo(event.target.checked); setSent(false); setNotice(""); }} /><span><span className="block font-semibold">{locale === "ar" ? "إرفاق فيديو العقار" : "Attach the property video"}</span><span className="mt-1 block text-xs text-ink-500">{locale === "ar" ? "يرسل الفيديو كوسائط واتساب مع عنوان العقار ورابطه." : "Sends the uploaded video as WhatsApp media with the property title and link."}</span></span></label>}
        <fieldset disabled={busy} className="mb-4">
          <SegmentedControl name="whatsapp-message-language" label={t("property.messageLanguage")} value={messageLocale}
            options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]}
            onChange={(value) => { setMessageLocale(value); setSent(false); setNotice(""); }} />
          <p className="mt-2 text-xs text-ink-500">{t("property.messageLanguageHint")}</p>
        </fieldset>
        <label htmlFor="whatsapp-recipient" className="label-field">{t("property.recipientPhone")}</label>
        <input id="whatsapp-recipient" className="input-field" type="tel" dir="ltr" placeholder="+9665XXXXXXXX" maxLength={25} required value={phone} disabled={busy} onChange={(e) => { setPhone(e.target.value); setSent(false); setNotice(""); }} />
        <button className="btn-primary mt-3" disabled={busy || sent}>{t(busy ? "property.sendingProperty" : includeVideo ? "property.sendPropertyVideo" : "property.sendProperty")}</button>
        {notice && <p role="status" className="mt-3 text-sm text-ink-600">{t(`property.${notice}`)}</p>}
      </div>
      <div className="rounded-xl bg-emerald-50 p-4">
        <p className="mb-2 text-xs font-semibold text-ink-500">{includeVideo ? (locale === "ar" ? "معاينة التعليق على الفيديو" : "Video caption preview") : t("property.messagePreview")}</p>
        <div dir={messageLocale === "ar" ? "rtl" : "ltr"} className="max-h-[32rem] overflow-y-auto rounded-xl border border-stone-200 bg-white text-sm">
          <p className="whitespace-pre-wrap break-words p-4 leading-relaxed text-ink-700">{includeVideo ? propertyVideoCaption(property, publicOrigin, messageLocale) : message}</p>
        </div>
      </div>
    </form>
  </section>;
}
