"use client";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Image from "next/image";
import { Icon } from "./Icon";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
export function InstallApp() {
  const { locale } = useLanguage(); const ar = locale === "ar";
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "mac" | "other">("other");
  const promptEvent = useRef<InstallEvent | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const check = () => setInstalled(display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    check(); setReady(window.isSecureContext);
    setPlatform(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : /Mac/.test(navigator.platform) ? "mac" : "other");
    const before = (event: Event) => { event.preventDefault(); promptEvent.current = event as InstallEvent; };
    const complete = () => { setInstalled(true); promptEvent.current = null; dialog.current?.close(); };
    window.addEventListener("beforeinstallprompt", before); window.addEventListener("appinstalled", complete); display.addEventListener("change", check);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => { /* Installation remains available without offline support. */ });
    }
    return () => { window.removeEventListener("beforeinstallprompt", before); window.removeEventListener("appinstalled", complete); display.removeEventListener("change", check); };
  }, []);
  async function install() {
    if (busy) return;
    const event = promptEvent.current;
    if (!event) { dialog.current?.showModal(); return; }
    setBusy(true); setError(false);
    try { await event.prompt(); const choice = await event.userChoice; if (choice.outcome === "accepted") setInstalled(true); }
    catch { setError(true); dialog.current?.showModal(); }
    finally { promptEvent.current = null; setBusy(false); }
  }
  if (!ready || installed) return null;
  const instructions = platform === "ios"
    ? ar ? "افتح الموقع في Safari، اضغط مشاركة، ثم «إضافة إلى الشاشة الرئيسية» وأكد الإضافة." : "Open this site in Safari, tap Share, choose Add to Home Screen, then confirm Add."
    : platform === "mac"
    ? ar ? "في Safari اختر ملف ← إضافة إلى Dock. في Chrome أو Edge استخدم زر التثبيت في شريط العنوان أو قائمة المتصفح." : "In Safari, choose File → Add to Dock. In Chrome or Edge, use the install icon in the address bar or browser menu."
    : ar ? "في Chrome أو Edge افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». إذا لم يظهر الخيار، افتح الموقع في متصفح يدعم تثبيت التطبيقات." : "In Chrome or Edge, open the browser menu and choose Install app or Add to Home Screen. If unavailable, open this site in a browser that supports app installation.";
  return <>
    <button type="button" className="estate-install-button" onClick={install} disabled={busy} aria-haspopup="dialog" aria-label={ar ? "تثبيت التطبيق" : "Install app"} title={ar ? "تثبيت التطبيق" : "Install app"}><Icon name="download" className="h-5 w-5" /></button>
    <dialog ref={dialog} className="estate-install-dialog" aria-labelledby="install-title" dir={ar ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><Image src="/icon" alt={ar ? "أيقونة 41 العقارية" : "41 Real Estate app icon"} width={64} height={64} unoptimized className="h-16 w-16 shrink-0 rounded-2xl border border-ink-100 bg-white shadow-sm" /><h2 id="install-title" className="text-lg font-semibold">{ar ? "تثبيت 41 العقارية" : "Install 41 Real Estate"}</h2></div><button type="button" autoFocus aria-label={ar ? "إغلاق" : "Close"} className="property-icon-action" onClick={() => dialog.current?.close()}><Icon name="close" /></button></div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{ar ? "تعذر فتح نافذة التثبيت. استخدم قائمة المتصفح." : "Could not open the install prompt. Use your browser menu."}</p>}
      <p className="my-5 text-sm leading-7 text-ink-600">{instructions}</p>
      <p className="mb-5 text-xs text-ink-400">{ar ? "تحتاج إلى الإنترنت لعرض العقارات وإدارتها. لا يلزم متجر تطبيقات." : "Internet is required to browse and manage properties. No app store needed."}</p>
      <button type="button" className="btn-primary" onClick={() => dialog.current?.close()}>{ar ? "فهمت" : "Got it"}</button>
    </dialog>
  </>;
}
