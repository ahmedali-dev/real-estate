"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { createSHA256 } from "hash-wasm";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const CHUNK = 2 * 1024 * 1024;
type PendingUpload = { id: string; ticket: string; hash: string };
export function LocalVideoUpload({ value, onChange, onBusyChange }: { value?: string | null; onChange: (value: string | null) => void; onBusyChange: (busy: boolean) => void }) {
  const { locale } = useLanguage(); const ar = locale === "ar";
  const [mode, setMode] = useState("local");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0); const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<"idle" | "hashing" | "uploading" | "verifying" | "paused" | "complete" | "error">("idle");
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file); setPreview(url); setPreviewFailed(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const controller = useRef<AbortController | null>(null);
  const running = useRef(false);
  useEffect(() => {
    let mounted = true;
    void fetch("/api/local-videos/config").then(res => res.ok ? res.json() : null).then(data => { if (mounted) { setEnabled(data?.enabled === true); setMode(data?.mode || "local"); } }).catch(() => {});
    return () => { mounted = false; controller.current?.abort(); };
  }, []);
  if (!enabled) return null;
  function selectFile(selected: File | undefined) {
    if (!selected || running.current) return;
    setFile(selected); setMessage(""); setProgress(0); setPhase("idle");
  }
  async function upload() {
    if (!file || running.current) return;
    running.current = true; onBusyChange(true); setBusy(true); setProgress(0); setPhase("hashing");
    const abort = new AbortController(); controller.current = abort;
    const key = `local-video:${file.name}:${file.size}:${file.lastModified}`;
    async function request(path: string, init: RequestInit = {}, pending?: PendingUpload) {
      const response = await fetch(`/api/local-videos/${path}`, { ...init, signal: abort.signal, headers: { ...init.headers, ...(pending ? { "X-Upload-Ticket": pending.ticket } : {}) } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(data.error || "Video upload failed."), { status: response.status });
      return data;
    }
    try {
      if (!/\.(mp4|mov|m4v|mkv|webm|avi)$/i.test(file.name) || file.size <= 0 || file.size > 20 * 1024 ** 3) throw Error(ar ? "اختر فيديو بصيغة مدعومة، حتى 20 جيجابايت." : "Choose a supported video up to 20 GB.");
      setMessage(ar ? "جارٍ التحقق من الملف…" : "Checking file…");
      const hash = await createSHA256(); hash.init();
      for (let offset = 0; offset < file.size; offset += CHUNK) {
        abort.signal.throwIfAborted(); hash.update(new Uint8Array(await file.slice(offset, offset + CHUNK).arrayBuffer()));
        setProgress(Math.round(Math.min(offset + CHUNK, file.size) / file.size * 100));
      }
      const digest = hash.digest("hex");
      let pending: PendingUpload | null = null;
      try { const saved = JSON.parse(localStorage.getItem(key) || "null"); if (saved?.hash === digest && typeof saved.id === "string" && typeof saved.ticket === "string") pending = saved; } catch {}
      if (!pending) {
        const created = await request("uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, size: file.size, sha256: digest }) });
        pending = { id: created.upload_id, ticket: created.ticket, hash: digest };
        try { localStorage.setItem(key, JSON.stringify(pending)); } catch {}
      }
      setPhase("uploading"); setProgress(0);
      setMessage(ar ? "جارٍ رفع الفيديو…" : "Uploading video…");
      let failures = 0;
      while (true) {
        abort.signal.throwIfAborted();
        try {
          const status = await request(`uploads/${pending.id}`, {}, pending);
          if (!Number.isSafeInteger(status.offset) || status.offset < 0 || status.offset > file.size) throw Error("Invalid server offset.");
          setProgress(Math.round(status.offset / file.size * 100));
          if (status.busy) throw Object.assign(new Error("Upload busy."), { status: 409 });
          if (status.offset === file.size) break;
          const result = await request(`uploads/${pending.id}`, { method: "PATCH", headers: { "Upload-Offset": String(status.offset), "Content-Type": "application/offset+octet-stream" }, body: file.slice(status.offset, status.offset + CHUNK) }, pending);
          if (result.offset <= status.offset) throw Error("Upload did not advance.");
          failures = 0;
        } catch (error) {
          const status = (error as { status?: number }).status;
          if ([401, 403, 404, 413, 415, 422, 507].includes(status || 0)) {
            if ([403, 404, 415].includes(status || 0)) try { localStorage.removeItem(key); } catch {}
            throw error;
          }
          if (abort.signal.aborted || ++failures > 5) throw error;
          setMessage(ar ? "جارٍ إعادة الاتصال…" : "Reconnecting…");
          await new Promise<void>((resolve, reject) => {
            const stop = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
            const timer = setTimeout(() => { abort.signal.removeEventListener("abort", stop); resolve(); }, Math.min(30000, 1000 * 2 ** (failures - 1)));
            abort.signal.addEventListener("abort", stop, { once: true });
          });
        }
      }
      setPhase("verifying");
      setMessage(ar ? "جارٍ التحقق النهائي…" : "Verifying upload…");
      const done = await request(`uploads/${pending.id}/complete`, { method: "POST" }, pending);
      if (typeof done.receipt !== "string") throw Error("Completion not confirmed.");
      setPhase("complete"); onChange(done.receipt); try { localStorage.removeItem(key); } catch {}
      setMessage(ar ? "تم رفع الفيديو. احفظ العقار لإرفاقه." : "Video uploaded. Save the listing to attach it."); setProgress(100);
    } catch (error) {
      setPhase(abort.signal.aborted ? "paused" : "error");
      setMessage(abort.signal.aborted ? (ar ? "تم الإيقاف مؤقتاً. اختر الملف نفسه للاستئناف." : "Paused. Select the same file to resume.") : error instanceof Error ? error.message : "Upload failed.");
    } finally { running.current = false; onBusyChange(false); setBusy(false); }
  }
  const completed = phase === "complete";
  const size = file ? new Intl.NumberFormat(ar ? "ar-SA" : "en", { maximumFractionDigits: 1 }).format(file.size / (1024 ** (file.size >= 1024 ** 3 ? 3 : 2))) + (file.size >= 1024 ** 3 ? " GB" : " MB") : "";
  const phaseLabel = phase === "hashing" ? (ar ? "تجهيز الفيديو" : "Preparing video") : phase === "verifying" ? (ar ? "التحقق النهائي" : "Final verification") : (ar ? "رفع الفيديو" : "Uploading video");
  return <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white" aria-busy={busy}>
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4 sm:px-6">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Icon name="video" /></span><div><h3 className="font-display text-base font-semibold text-ink-800">{ar ? "فيديو العقار" : "Property video"}</h3><p className="mt-1 text-xs leading-5 text-ink-400">{ar ? "أضف جولة فيديو لتفاصيل العقار — اختياري" : "Add a video tour of the property — optional"}</p></div></div>
      <span className="rounded-full border border-ink-100 bg-stone-50 px-3 py-1 text-[11px] font-medium text-ink-500">{mode === "online" ? (ar ? "رفع عبر الإنترنت" : "Online upload") : (ar ? "رفع محلي" : "Local upload")}</span>
    </header>
    <div className="space-y-4 p-5 sm:p-6">
      <input ref={input} type="file" className="sr-only" tabIndex={-1} accept=".mp4,.mov,.m4v,.mkv,.webm,.avi" aria-label={ar ? "اختر فيديو العقار" : "Choose property video"} disabled={busy} onChange={event => { selectFile(event.target.files?.[0]); event.target.value = ""; }} />
      {!file ? <button type="button" disabled={busy} onClick={() => input.current?.click()}
        onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files[0]); }}
        className={`group flex min-h-48 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-7 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 ${dragging ? "border-sky-400 bg-sky-50" : "border-ink-200 bg-stone-50 hover:border-sky-300 hover:bg-sky-50/50"}`}>
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-ink-100 bg-white text-sky-600 transition group-hover:-translate-y-0.5"><Icon name="video" className="h-6 w-6" /></span>
        <span className="text-sm font-semibold text-ink-700">{ar ? "اسحب الفيديو هنا أو اختر من جهازك" : "Drop your video here or browse files"}</span>
        <span className="mt-2 text-xs leading-6 text-ink-400">{ar ? "MP4، MOV، WebM والمزيد · حتى 20 جيجابايت" : "MP4, MOV, WebM and more · up to 20 GB"}</span>
        <span className="mt-4 rounded-full border border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-700">{ar ? "اختيار فيديو" : "Choose video"}</span>
      </button> : <div className="overflow-hidden rounded-xl border border-ink-100">
        <div className="relative flex aspect-video max-h-64 items-center justify-center bg-ink-900">
          {preview && !previewFailed ? <video key={preview} src={preview} controls preload="metadata" playsInline className="h-full max-h-64 w-full object-contain" onError={() => setPreviewFailed(true)} aria-label={ar ? "معاينة الفيديو المختار" : "Selected video preview"} /> : <div className="flex flex-col items-center gap-3 p-6 text-center text-white"><Icon name="video" className="h-9 w-9" /><span className="text-xs">{ar ? "هذا المتصفح لا يدعم معاينة الصيغة. يمكنك رفع الملف." : "This browser cannot preview this format. You can still upload it."}</span></div>}
        </div>
        <div className="flex items-center gap-3 bg-stone-50 p-4"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${completed ? "bg-sky-100 text-sky-700" : "border border-ink-100 bg-white text-ink-500"}`}><Icon name={completed ? "check" : "video"} /></span><div className="min-w-0 flex-1"><p dir="auto" className="truncate text-sm font-semibold text-ink-700" title={file.name}>{file.name}</p><p className="mt-1 text-xs text-ink-400" dir="ltr">{size} · {file.name.split(".").pop()?.toUpperCase()}</p></div><button type="button" disabled={busy} onClick={() => input.current?.click()} className="rounded-lg px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 disabled:opacity-50">{ar ? "تغيير" : "Change"}</button></div>
      </div>}
      {value && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-sky-800"><Icon name="check" className="h-4 w-4" /><span className="flex-1">{ar ? "يوجد فيديو مرفق بالعقار" : "A video is attached to this listing"}</span><button type="button" disabled={busy} className="rounded-lg px-2 py-1 text-xs font-semibold underline underline-offset-4 disabled:opacity-50" onClick={() => { onChange(null); if (completed) { setFile(null); setPhase("idle"); setMessage(""); setProgress(0); } }}>{ar ? "إزالة الإرفاق" : "Detach"}</button></div>}
      {busy && <div className="space-y-2 rounded-xl bg-stone-50 p-4"><div className="flex items-center justify-between gap-3 text-xs font-medium text-ink-600"><span>{phaseLabel}</span><span className="tabular-nums" dir="ltr">{progress}%</span></div><progress className="block h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-ink-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-sky-500 [&::-moz-progress-bar]:bg-sky-500" max={100} value={progress} aria-label={phaseLabel} /></div>}
      {message && <p role={phase === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-xs leading-6 ${phase === "error" ? "bg-red-50 text-red-700" : completed ? "bg-sky-50 text-sky-800" : "bg-stone-50 text-ink-600"}`}>{message}</p>}
      {file && !completed && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4"><p className="max-w-xs text-xs leading-5 text-ink-400">{ar ? "يمكنك إيقاف الرفع مؤقتاً واستئنافه دون البدء من جديد." : "Pause anytime and resume without starting over."}</p>{busy ? <button type="button" className="btn-secondary gap-2 !rounded-full" onClick={() => controller.current?.abort()}><Icon name="close" className="h-4 w-4" />{ar ? "إيقاف مؤقت" : "Pause upload"}</button> : <button type="button" className="btn-primary gap-2 !rounded-full" onClick={() => void upload()}><Icon name="arrow" className="h-4 w-4 -rotate-90" />{phase === "paused" || phase === "error" ? (ar ? "استئناف الرفع" : "Resume upload") : (ar ? "رفع الفيديو" : "Upload video")}</button>}</div>}
      <p className="text-[11px] leading-5 text-ink-400">{ar ? "احفظ العقار بعد اكتمال الرفع لإرفاق الفيديو. المعاينة أعلاه للملف المختار من جهازك." : "Save the listing after uploading to attach the video. The preview shows the file selected from your device."}</p>
    </div>
  </section>;
}
