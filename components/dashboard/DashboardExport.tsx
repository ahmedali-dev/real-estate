"use client";
import { useEffect, useRef, useState } from "react";
import { createPrintService, normalizePrintScale } from "@/lib/print-service";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { fetchProperties } from "@/lib/api-client";
import { collectDashboardReport, dashboardCsv, dashboardPrintHtml, reportFilterSummary, PRINT_COLUMNS, selectedPrintColumns, togglePrintColumn, type PrintColumn, type PrintOptions } from "@/lib/dashboard-export";
import type { FilterState } from "@/components/properties/FilterBar";
import type { PropertyDTO } from "@/types/property";

export function DashboardExport({ filters, properties, total, ready, page }: { filters: FilterState; properties: PropertyDTO[]; total: number; ready: boolean; page: number }) {
  const { locale } = useLanguage(); const ar = locale === "ar";
  const [scope, setScope] = useState("all"); const [owners, setOwners] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions>({ scale: 100, title: "", orientation: "landscape", textSize: "normal", density: "comfortable", columns: ["listing", "status", "price", "location"], showSummary: true, showFilters: true, showIds: false });
  const columnNames: Record<PrintColumn, string> = { listing: ar ? "نوع العرض" : "Listing type", status: ar ? "الحالة" : "Status", visibility: ar ? "الظهور" : "Visibility", price: ar ? "السعر" : "Price", location: ar ? "الموقع" : "Location", source: ar ? "مصدر العرض" : "Offer source" };
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState("");
  const active = useRef<AbortController | null>(null); const printService = useRef<ReturnType<typeof createPrintService> | null>(null);
  const lastReport = useRef<{ rows: PropertyDTO[]; context: Omit<Parameters<typeof dashboardPrintHtml>[1], "print" | "includeOwners"> } | null>(null);
  useEffect(() => {
    const report = lastReport.current;
    if (!report) return;
    if (printService.current?.refresh(dashboardPrintHtml(report.rows, { ...report.context, includeOwners: owners, print: printOptions }))) {
      setNotice(ar ? "تم تحديث التقرير المفتوح باختياراتك. اطبع من تبويب التقرير أو افتح تقريراً جديداً." : "Open report updated with your selections. Print from the report tab or open a new report.");
    }
  }, [printOptions, owners, ar]);
  useEffect(() => () => { active.current?.abort(); printService.current?.dispose(); }, []);
  async function run(action: "csv" | "print") {
    if (active.current) return;
    const abort = new AbortController(); active.current = abort; setBusy(true); setNotice("");
    try {
      if (action === "print") {
        printService.current ??= createPrintService();
        printService.current.prepare(ar ? "جارٍ تجهيز التقرير…" : "Preparing report…");
      }
      const rows = scope === "page" ? properties : await collectDashboardReport(page => fetchProperties({ ...filters, page, limit: 100 }, abort.signal));
      abort.signal.throwIfAborted();
      if (!rows.length) { printService.current?.dispose(); setNotice(ar ? "لا توجد عقارات للتصدير." : "No listings to export."); return; }
      if (action === "csv") {
        const url = URL.createObjectURL(new Blob([dashboardCsv(rows, locale, owners)], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a"); link.href = url; link.download = `41-listings-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice(ar ? `تم تجهيز ${rows.length} عقار للتنزيل.` : `Prepared ${rows.length} listings for download.`);
      } else {
        printService.current ??= createPrintService();
        const context = { locale, filters: reportFilterSummary(filters, locale), scope: scope === "page" ? (ar ? `الصفحة الحالية (${page})` : `Current page (${page})`) : (ar ? "جميع النتائج المطابقة" : "All matching results"), generatedAt: new Date() };
        lastReport.current = { rows, context };
        const html = dashboardPrintHtml(rows, { ...context, includeOwners: owners, print: printOptions });
        await printService.current.print(html, { title: ar ? "تقرير العقارات للطباعة" : "Printable listing report", signal: abort.signal, buttonLabel: ar ? "طباعة / حفظ PDF" : "Print / Save PDF" });
        setNotice(ar ? "تم فتح نافذة الطباعة. اختر حفظ PDF إذا أردت." : "Print dialog opened. Choose Save as PDF if needed.");
      }
    } catch (error) {
      printService.current?.dispose();
      if (!abort.signal.aborted) setNotice(error instanceof Error && error.message === "PopupBlocked" ? (ar ? "اسمح بالنوافذ المنبثقة لهذا الموقع لفتح تقرير الطباعة، ثم أعد المحاولة." : "Allow pop-ups for this site to open the print report, then try again.") : error instanceof Error && error.message === "limit" ? (ar ? "النتائج تتجاوز 10,000 عقار. ضيّق الفلاتر ثم أعد المحاولة." : "More than 10,000 listings match. Narrow the filters and try again.") : error instanceof Error && error.message === "changed" ? (ar ? "تغيرت النتائج أثناء التجهيز. حدّث الصفحة وأعد المحاولة." : "Results changed while preparing the report. Refresh and try again.") : (ar ? "تعذر تجهيز التقرير. أعد المحاولة." : "Could not prepare the report. Try again."));
    } finally { active.current = null; setBusy(false); }
  }
  return <section className="mb-5 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5" aria-label={ar ? "تصدير وطباعة العقارات" : "Export and print listings"} aria-busy={busy}>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-sm font-semibold text-ink-800">{ar ? "تصدير وطباعة" : "Export & print"}</h2><p className="mt-1 text-xs text-ink-400">{ar ? "يشمل الفلاتر والترتيب الحالي. ملف CSV متوافق مع Excel." : "Uses your current filters and sort order. CSV opens in Excel."}</p></div>
    <div className="flex flex-wrap items-center gap-2"><label className="min-w-48 text-xs"><span className="sr-only">{ar ? "نطاق التقرير" : "Report scope"}</span><SelectDropdown className="input-field" value={scope} disabled={busy} onChange={e => setScope(e.target.value)}><option value="all">{ar ? `كل النتائج (${total})` : `All results (${total})`}</option><option value="page">{ar ? `الصفحة الحالية (${properties.length})` : `Current page (${properties.length})`}</option></SelectDropdown></label>
    <button type="button" className="btn-secondary gap-2" disabled={busy || !ready || !total} onClick={() => void run("csv")}><Icon name="download" className="h-4 w-4" />{ar ? "تصدير CSV" : "Export CSV"}</button><button type="button" className="btn-secondary gap-2" disabled={busy || !ready || !total} onClick={() => void run("print")}><Icon name="printer" className="h-4 w-4" />{ar ? "طباعة / PDF" : "Print / PDF"}</button></div></div>
    <label className="mt-4 flex items-center gap-2 text-xs text-ink-500"><input type="checkbox" className="accent-sky-500" disabled={busy} checked={owners} onChange={e => setOwners(e.target.checked)} />{ar ? "تضمين بيانات اتصال المالك" : "Include owner contact information"}</label>
    <details className="mt-4 rounded-xl border border-ink-100 bg-stone-50 open:pb-4"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink-700">{ar ? "تخصيص تقرير الطباعة" : "Customize printed report"}</summary>
      <fieldset disabled={busy} className="space-y-4 px-4">
        <label className="block text-xs font-medium text-ink-600">{ar ? "عنوان التقرير" : "Report title"}<input className="input-field mt-2" maxLength={120} value={printOptions.title} placeholder={ar ? "تقرير العقارات" : "Property listings report"} onChange={e => setPrintOptions({ ...printOptions, title: e.target.value })} /></label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-xs font-medium text-ink-600">{ar ? "اتجاه الصفحة" : "Orientation"}<SelectDropdown className="input-field mt-2" value={printOptions.orientation} onChange={e => setPrintOptions({ ...printOptions, orientation: e.target.value as PrintOptions["orientation"] })}><option value="landscape">{ar ? "أفقي" : "Landscape"}</option><option value="portrait">{ar ? "عمودي" : "Portrait"}</option></SelectDropdown></label>
          <label className="text-xs font-medium text-ink-600">{ar ? "حجم النص" : "Text size"}<SelectDropdown className="input-field mt-2" value={printOptions.textSize} onChange={e => setPrintOptions({ ...printOptions, textSize: e.target.value as PrintOptions["textSize"] })}><option value="small">{ar ? "صغير" : "Small"}</option><option value="normal">{ar ? "عادي" : "Normal"}</option><option value="large">{ar ? "كبير" : "Large"}</option></SelectDropdown></label>
          <label className="text-xs font-medium text-ink-600">{ar ? "تباعد الصفوف" : "Row spacing"}<SelectDropdown className="input-field mt-2" value={printOptions.density} onChange={e => setPrintOptions({ ...printOptions, density: e.target.value as PrintOptions["density"] })}><option value="comfortable">{ar ? "مريح" : "Comfortable"}</option><option value="compact">{ar ? "مضغوط" : "Compact"}</option></SelectDropdown></label>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><span className="text-sm font-semibold text-ink-700">{ar ? "مقياس الطباعة" : "Print scale"}</span><button type="button" className="text-xs font-semibold text-sky-700" onClick={() => setPrintOptions({ ...printOptions, scale: 100 })}>{ar ? "إعادة إلى 100٪" : "Reset to 100%"}</button></div>
          <div className="flex flex-wrap items-center gap-4"><label className="flex-1"><span className="sr-only">{ar ? "مقياس الطباعة من 50 إلى 150 بالمئة" : "Print scale from 50 to 150 percent"}</span><input className="w-full accent-sky-500" type="range" min={50} max={150} step={5} value={printOptions.scale ?? 100} onChange={e => setPrintOptions({ ...printOptions, scale: Number(e.target.value) })} /></label><label className="flex items-center gap-2 text-sm font-semibold"><span className="sr-only">{ar ? "مقياس مخصص" : "Custom scale"}</span><input className="input-field !w-24 text-center" type="number" min={50} max={150} step={1} value={printOptions.scale ?? 100} onChange={e => { if (e.target.value) setPrintOptions({ ...printOptions, scale: Number(e.target.value) }); }} onBlur={() => setPrintOptions({ ...printOptions, scale: normalizePrintScale(printOptions.scale) })} />%</label></div>
          <div className="mt-3 flex flex-wrap gap-2">{[75, 85, 100, 110, 125].map(scale => <button key={scale} type="button" aria-pressed={printOptions.scale === scale} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${printOptions.scale === scale ? "border-sky-300 bg-sky-50 text-sky-800" : "border-ink-100 text-ink-600"}`} onClick={() => setPrintOptions({ ...printOptions, scale })}>{scale}%</button>)}</div>
          <p className="mt-3 text-xs leading-6 text-ink-400">{ar ? "مقياس أصغر يناسب عقارات أكثر، ومقياس أكبر يسهّل القراءة. اترك مقياس نافذة المتصفح على 100٪ لتجنب تطبيق المقياس مرتين." : "Smaller scales fit more listings; larger scales improve readability. Keep the browser print dialog scale at 100% to avoid scaling twice."}</p>
        </div>
        <fieldset><legend className="mb-3 text-xs font-semibold text-ink-700">{ar ? "الأعمدة (العقار مرئي دائماً)" : "Columns (property always included)"}</legend><div className="flex flex-wrap gap-x-5 gap-y-3">{PRINT_COLUMNS.map(column => <label key={column} className="flex items-center gap-2 text-xs text-ink-600"><input type="checkbox" className="accent-sky-500" checked={selectedPrintColumns(printOptions).includes(column)} onChange={e => { const checked = e.currentTarget.checked; setPrintOptions(previous => togglePrintColumn(previous, column, checked)); }} />{columnNames[column]}</label>)}</div></fieldset>
        <div aria-live="polite" className="rounded-xl border border-ink-100 bg-white p-3"><p className="mb-2 text-xs font-semibold text-ink-600">{ar ? "أعمدة التقرير المحددة" : "Selected report columns"}</p><div className="flex flex-wrap gap-2"><span className="rounded-full bg-stone-50 px-3 py-1 text-xs text-ink-700">{ar ? "العقار" : "Property"}</span>{selectedPrintColumns(printOptions).map(column => <span key={column} className="rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-800">{columnNames[column]}</span>)}{owners && <span className="rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-800">{ar ? "المالك / الهاتف" : "Owner / phone"}</span>}</div></div>
        <div className="flex flex-wrap gap-x-5 gap-y-3 border-t border-ink-100 pt-4">{(["showSummary", "showFilters", "showIds"] as const).map(key => <label key={key} className="flex items-center gap-2 text-xs text-ink-600"><input type="checkbox" className="accent-sky-500" checked={Boolean(printOptions[key])} onChange={e => { const checked = e.currentTarget.checked; setPrintOptions(previous => ({ ...previous, [key]: checked })); }} />{key === "showSummary" ? (ar ? "ملخص الحالات" : "Status summary") : key === "showFilters" ? (ar ? "الفلاتر المستخدمة" : "Applied filters") : (ar ? "معرّفات العقارات" : "Listing IDs")}</label>)}</div>
        <p className="text-xs leading-6 text-ink-400">{ar ? "للقراءة الأفضل: استخدم الوضع الأفقي عند اختيار أعمدة كثيرة. هذه الخيارات تخص الطباعة فقط." : "For easier reading, use landscape when selecting many columns. These settings apply to printing only."}</p>
      </fieldset>
    </details>
    {busy && <p role="status" className="mt-3 text-sm text-ink-500">{ar ? "جارٍ تجهيز التقرير…" : "Preparing report…"}</p>}{notice && <p role="status" className="mt-3 text-sm text-ink-600">{notice}</p>}
  </section>;
}
