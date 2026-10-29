"use client";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
export function WhatsAppSettings({ onSaved }: { onSaved: () => void }) {
  const { locale } = useLanguage(); const ar = locale === "ar";
  const [data, setData] = useState({ url: "", apiKey: "", siteUrl: "", replyLocale: "ar", hasKey: false });
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState("");
  useEffect(() => { let active = true; fetch('/api/whatsapp/settings', { cache: 'no-store' }).then(async response => { if (!response.ok) throw Error(); const result = await response.json(); if (active) setData({ ...result, apiKey: "" }); }).catch(() => { if (active) setNotice(ar ? "تعذر تحميل الإعدادات. أعد تحميل الصفحة." : "Could not load settings. Reload the page."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [ar]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setNotice("");
    try { const response = await fetch('/api/whatsapp/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: data.url, apiKey: data.apiKey, siteUrl: data.siteUrl, replyLocale: data.replyLocale }) }); const result = await response.json(); if (!response.ok) throw Error(result.error); setData(value => ({ ...value, apiKey: "", hasKey: true })); setNotice(ar ? "تم حفظ الإعدادات. جارٍ فحص الاتصال." : "Settings saved. Checking connection."); onSaved(); }
    catch (error) { setNotice(error instanceof Error ? error.message : ar ? "تعذر الحفظ" : "Could not save settings"); } finally { setBusy(false); }
  }
  return <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6"><h2 className="text-xl font-semibold">{ar ? "إعدادات خادم واتساب" : "WhatsApp server settings"}</h2><p className="mt-2 text-sm text-ink-500">{ar ? "شغّل الخدمة المستقلة على خادمك ثم أدخل عنوانها ومفتاحها هنا." : "Run the standalone service on your server, then enter its URL and matching API key here."}</p>
    <form onSubmit={save} className="mt-5 space-y-4"><fieldset disabled={loading || busy} className="space-y-4">
    <label className="block text-sm">{ar ? "عنوان خادم واتساب" : "WhatsApp server URL"}<input required type="url" dir="ltr" className="input-field mt-2" placeholder="https://whatsapp.example.com" value={data.url} onChange={e => setData({ ...data, url: e.target.value })} /></label>
    <label className="block text-sm">API key<input type="password" autoComplete="new-password" dir="ltr" required={!data.hasKey} className="input-field mt-2" placeholder={data.hasKey ? (ar ? "محفوظ — اتركه فارغًا للاحتفاظ به" : "Saved — leave blank to keep") : ""} value={data.apiKey} onChange={e => setData({ ...data, apiKey: e.target.value })} /></label>
    <label className="block text-sm">{ar ? "عنوان الموقع العام" : "Public website URL"}<input required type="url" dir="ltr" className="input-field mt-2" value={data.siteUrl} onChange={e => setData({ ...data, siteUrl: e.target.value })} /></label>
    <label className="block text-sm">{ar ? "لغة الرد التلقائي" : "Automatic reply language"}<SelectDropdown className="input-field mt-2" value={data.replyLocale} onChange={e => setData({ ...data, replyLocale: e.target.value })}><option value="ar">العربية</option><option value="en">English</option></SelectDropdown></label>
    <p className="text-xs text-ink-500">{ar ? "عنوان Webhook على خادم واتساب:" : "Set this webhook URL on the WhatsApp service:"}<code dir="ltr" className="mt-1 block break-all">{data.siteUrl.replace(/\/$/, '')}/api/webhooks/whatsapp</code></p>
    <button type="submit" className="btn-primary" disabled={loading || busy}>{busy ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ وفحص الاتصال" : "Save & check connection")}</button></fieldset>{notice && <p role="status" className="text-sm">{notice}</p>}</form></section>;
}
