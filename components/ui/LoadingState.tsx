"use client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

function LoadingLabel() {
  const { locale } = useLanguage();
  return <span className="sr-only">{locale === "ar" ? "جارٍ التحميل…" : "Loading…"}</span>;
}
function Bar({ className = "" }: { className?: string }) {
  return <div className={`loading-skeleton ${className}`} />;
}
export function LoadingGrid({ count = 6 }: { count?: number }) {
  return <div role="status" aria-live="polite" aria-busy="true" className="loading-region">
    <LoadingLabel />
    <div aria-hidden="true" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => <div key={i} className="loading-card">
        <Bar className="loading-card-photo" />
        <div className="space-y-3 p-5"><Bar className="h-3 w-1/2" /><Bar className="h-5 w-4/5" /><Bar className="h-3 w-full" /><div className="flex gap-2 py-1"><Bar className="h-7 w-20" /><Bar className="h-7 w-20" /></div><div className="border-t border-ink-100 pt-4"><Bar className="h-6 w-2/5" /></div><Bar className="h-11 w-full" /></div>
      </div>)}
    </div>
  </div>;
}
export function LoadingRow() {
  return <div role="status" aria-live="polite" aria-busy="true" className="loading-region loading-table">
    <LoadingLabel />
    <div aria-hidden="true"><div className="loading-table-heading"><Bar className="h-3 w-1/4" /><Bar className="h-3 w-1/6" /><Bar className="h-3 w-1/6" /></div>
      {Array.from({ length: 5 }, (_, i) => <div key={i} className="loading-table-row"><Bar className="h-12 w-16 shrink-0" /><div className="flex-1 space-y-2"><Bar className="h-4 w-3/4" /><Bar className="h-3 w-1/2" /></div><Bar className="h-6 w-16" /><Bar className="hidden h-4 w-24 sm:block" /></div>)}
    </div>
  </div>;
}
export function LoadingProperty() {
  return <div role="status" aria-live="polite" aria-busy="true" className="loading-region mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
    <LoadingLabel /><div aria-hidden="true"><Bar className="mb-6 h-4 w-36" /><Bar className="h-[260px] w-full sm:h-[400px]" /><div className="mt-7 grid gap-8 md:grid-cols-[1.8fr_1fr]"><div className="space-y-4"><Bar className="h-7 w-32" /><Bar className="h-9 w-4/5" /><Bar className="h-4 w-1/2" /><Bar className="mt-6 h-24 w-full" /></div><div className="loading-card space-y-5 p-6"><Bar className="h-8 w-1/2" /><Bar className="h-4 w-3/4" /><Bar className="h-11 w-full" /><Bar className="h-11 w-full" /></div></div></div>
  </div>;
}
export function LoadingForm() {
  return <div role="status" aria-live="polite" aria-busy="true" className="loading-region loading-card p-6 sm:p-8"><LoadingLabel /><div aria-hidden="true" className="space-y-6"><Bar className="h-7 w-1/2" />{Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-2"><Bar className="h-3 w-24" /><Bar className="h-12 w-full" /></div>)}<Bar className="h-11 w-40" /></div></div>;
}
