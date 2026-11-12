"use client";
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Icon } from "@/components/ui/Icon";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { VIDEO_MODES, type VideoMode } from "@/lib/video-upload-config";

type Profile = { url: string; apiKey: string; clearKey: boolean; hasKey: boolean; requiresKey: boolean };
type Settings = { enabled: boolean; mode: VideoMode; local: Profile; online: Profile };
const empty = (): Profile => ({ url: "", apiKey: "", clearKey: false, hasKey: false, requiresKey: false });
export function VideoUploadSettings() {
  const { locale } = useLanguage(); const ar = locale === "ar";
  const [data, setData] = useState<Settings>({ enabled: false, mode: "local", local: empty(), online: empty() });
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState(""); const [error, setError] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/video-upload/settings", { cache: "no-store" });
    const result = await response.json(); if (!response.ok) throw Error(result.error);
    setData({ enabled: result.enabled, mode: result.mode, local: { ...empty(), ...result.local }, online: { ...empty(), ...result.online } }); setDirty(false); setLoaded(true);
  }, []);
  useEffect(() => { void load().catch(() => { setError(true); setNotice(ar ? "تعذر تحميل الإعدادات. أعد المحاولة." : "Could not load settings. Try again."); }).finally(() => setLoading(false)); }, [load, ar]);
  function change(profile: VideoMode, update: Partial<Profile>) { setDirty(true); setData(value => ({ ...value, [profile]: { ...value[profile], ...update } })); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setNotice(""); setError(false);
    try {
      const response = await fetch("/api/video-upload/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json(); if (!response.ok) throw Error(result.error);
      await load(); setNotice(ar ? "تم حفظ إعدادات رفع الفيديو." : "Video upload settings saved.");
    } catch (error) { setError(true); setNotice(error instanceof Error ? error.message : "Could not save settings."); }
    finally { setBusy(false); }
  }
  async function check() {
    setBusy(true); setNotice(""); setError(false);
    try {
      const response = await fetch("/api/video-upload/settings", { method: "POST" }); const result = await response.json(); if (!response.ok) throw Error(result.error);
      setNotice(ar ? "خادم الفيديو متاح. يمكنك رفع فيديو من نموذج العقار." : "Video server is reachable. You can upload from a listing form.");
    } catch (error) { setError(true); setNotice(error instanceof Error ? error.message : "Connection failed."); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto w-full max-w-5xl space-y-6">
    <header className="flex items-start gap-4"><span className="rounded-2xl border border-ink-100 bg-white p-3 text-moss-600"><Icon name="video" className="h-7 w-7" /></span><div><h1 className="font-display text-3xl font-semibold text-ink-800">{ar ? "إعدادات رفع الفيديو" : "Video upload settings"}</h1><p className="mt-2 text-sm text-ink-500">{ar ? "اختر خادم الفيديو المحلي أو عبر الإنترنت لرفع فيديو اختياري للعقارات." : "Choose a local or online video server for optional listing videos."}</p></div></header>
    <form onSubmit={save} className="space-y-6">
      <fieldset disabled={loading || busy || !loaded} className="space-y-6">
        <section className="rounded-2xl border border-ink-100 bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-5"><div><h2 className="text-lg font-semibold text-ink-800">{ar ? "رفع الفيديو" : "Video uploads"}</h2><p className="mt-1 text-sm text-ink-500">{ar ? "إيقاف الميزة يخفي أداة الرفع دون حذف الملفات الموجودة." : "Turning this off hides the uploader and keeps existing files."}</p></div><label className="flex items-center gap-3 text-sm font-semibold"><input className="h-5 w-5 accent-sky-500" type="checkbox" checked={data.enabled} onChange={e => { setDirty(true); setData({ ...data, enabled: e.target.checked }); }} />{ar ? "تفعيل رفع الفيديو" : "Enable video uploads"}</label></div>
          <label className="mt-5 block max-w-md text-sm font-medium">{ar ? "الوضع النشط" : "Active mode"}<SelectDropdown className="input-field mt-2" value={data.mode} onChange={e => { setDirty(true); setData({ ...data, mode: e.target.value as VideoMode }); }}><option value="local">{ar ? "محلي — localhost" : "Local — localhost"}</option><option value="online">{ar ? "عبر الإنترنت — HTTPS" : "Online — HTTPS"}</option></SelectDropdown></label>
          <p className="mt-3 text-xs leading-6 text-ink-500">{ar ? "المحلي يعمل فقط مع npm run dev من localhost. عبر الإنترنت يتيح الرفع للموظفين المصرح لهم على الموقع المنشور. الإعدادات مشتركة بين الخوادم التي تستخدم قاعدة البيانات نفسها." : "Local works only with npm run dev on localhost. Online allows authorized listing staff to upload on the published site. Settings are shared by servers using this database."}</p>
        </section>
        <div className="grid gap-5 md:grid-cols-2">{VIDEO_MODES.map(mode => <section key={mode} className={`rounded-2xl border bg-white p-6 ${data.mode === mode ? "border-sky-300 ring-1 ring-sky-100" : "border-ink-100"}`}>
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-ink-800">{mode === "local" ? (ar ? "الخادم المحلي" : "Local server") : (ar ? "خادم الإنترنت" : "Online server")}</h2>{data.mode === mode && <span className="rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-700">{ar ? "المحدد" : "Selected"}</span>}</div>
          <label className="mt-5 block text-sm">{ar ? "عنوان خادم الفيديو" : "Video server URL"}<input className="input-field mt-2" type="url" dir="ltr" required={data.enabled && data.mode === mode} value={data[mode].url} placeholder={mode === "local" ? "http://192.168.1.200:8000" : "https://videos.example.com"} onChange={e => change(mode, { url: e.target.value })} /></label>
          {mode === "local" && <p className="mt-2 text-xs text-ink-500">{ar ? "يمكن استخدام localhost أو عنوان IP خاص داخل الشبكة، مثل 192.168.1.200." : "Use localhost or a private LAN IP, such as 192.168.1.200."}</p>}
          {data[mode].requiresKey && <p role="alert" className="mt-3 text-sm text-rust-500">{ar ? "تعذر قراءة المفتاح المحفوظ. أدخله مجدداً أو اختر بدون مفتاح." : "Saved key cannot be read. Re-enter it or choose No API key."}</p>}
          <label className="mt-4 block text-sm">{ar ? "مفتاح API" : "API key"}<input className="input-field mt-2" type="password" dir="ltr" autoComplete="new-password" disabled={data[mode].clearKey} value={data[mode].apiKey} placeholder={data[mode].hasKey ? (ar ? "محفوظ — اتركه فارغاً للاحتفاظ به" : "Saved — leave blank to keep") : (ar ? "اختياري إذا كان الخادم لا يتطلب مفتاحاً" : "Optional for servers without authentication")} onChange={e => change(mode, { apiKey: e.target.value })} /></label>
          <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={data[mode].clearKey} onChange={e => change(mode, { clearKey: e.target.checked, apiKey: "" })} />{ar ? "بدون مفتاح API (حذف المفتاح المحفوظ)" : "No API key (remove saved key)"}</label>
        </section>)}</div>
        <div className="flex flex-wrap items-center gap-3"><button type="submit" className="btn-primary">{busy ? (ar ? "جارٍ التنفيذ…" : "Working…") : (ar ? "حفظ الإعدادات" : "Save settings")}</button><button type="button" className="btn-secondary" disabled={!data.enabled || dirty} onClick={() => void check()}>{ar ? "فحص الاتصال المحفوظ" : "Check saved connection"}</button>{dirty && <span className="text-xs text-ink-500">{ar ? "احفظ التغييرات قبل فحص الاتصال." : "Save changes before checking the connection."}</span>}</div>
      </fieldset>
    </form>
    {loading && <p role="status">{ar ? "جارٍ التحميل…" : "Loading…"}</p>}
    {notice && <div role={error ? "alert" : "status"} className={`rounded-xl border p-4 text-sm ${error ? "border-rust-200 text-rust-500" : "border-ink-100 text-ink-700"}`}>{notice}</div>}
    {!loading && error && <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setLoading(true); void load().then(() => { setError(false); setNotice(""); }).catch(() => {}).finally(() => setLoading(false)); }}>{ar ? "إعادة تحميل الإعدادات" : "Reload settings"}</button>}
  </div>;
}
