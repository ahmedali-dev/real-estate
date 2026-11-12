import { normalizePrintScale, scaleReportCss } from "@/lib/print-service";
import type { PropertyDTO, PropertyListResponse } from "@/types/property";
import { formatLocation, formatPriceWithPeriod } from "@/lib/format";
import { dashboardFilterGroups } from "@/lib/dashboard-filters";

export type ReportLocale = "en" | "ar";
const labels: Record<string, [string, string]> = {
  build: ["Building / property", "مبنى / عقار"], apartment: ["Apartment", "شقة"], land: ["Land", "أرض"],
  villa: ["Villa", "فيلا"], duplex: ["Duplex", "دوبلكس"], floor: ["Floor", "دور"], shop: ["Shop", "محل"], other: ["Other", "أخرى"],
  sale: ["Sale", "للبيع"], rent: ["Rent", "للإيجار"], available: ["Available", "متاح"], sold: ["Sold", "مباع"], rented: ["Rented", "مؤجر"],
  public: ["Public", "عام"], private: ["Private", "خاص"], monthly: ["Monthly", "شهري"], yearly: ["Yearly", "سنوي"],
};
function label(value: string | undefined, locale: ReportLocale) { return value ? labels[value]?.[locale === "ar" ? 1 : 0] || value : ""; }
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  // Spreadsheet programs must treat user-entered formulas and phone numbers as text.
  if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
export function dashboardCsv(properties: PropertyDTO[], locale: ReportLocale, includeOwners = false) {
  const ar = locale === "ar";
  const heading = ar ? ["معرف العقار", "العنوان", "الفئة", "نوع العقار", "نوع العرض", "الحالة", "الظهور", "السعر (ريال)", "مدة الإيجار", "المدينة", "الحي", "العنوان التفصيلي", "الغرف", "دورات المياه", "عدد الوحدات", "مصدر العرض", "الوصف", "رابط الموقع", "رابط TikTok", "تاريخ الإضافة", "آخر تحديث"] : ["Listing ID", "Title", "Category", "Property type", "Listing type", "Status", "Visibility", "Price (SAR)", "Rental period", "City", "District", "Address", "Rooms", "Bathrooms", "Units", "Offer brought by", "Description", "Location URL", "TikTok URL", "Created at", "Updated at"];
  if (includeOwners) heading.push(...(ar ? ["اسم المالك", "هاتف المالك", "بريد المالك"] : ["Owner name", "Owner phone", "Owner email"]));
  const rows = properties.map(p => {
    const row: unknown[] = [p._id, p.title, label(p.category, locale), label(p.propertyType, locale), label(p.listingType, locale), label(p.status, locale), label(p.visibility, locale), p.price ?? "", label(p.rentalPeriod, locale), p.location?.city, p.location?.district, p.location?.address, p.category === "land" ? "" : p.details?.rooms, p.category === "land" ? "" : p.details?.bathrooms, p.category === "build" ? p.units.length : "", p.broughtBy?.name, p.description, p.location?.mapUrl, p.tiktokUrl, p.createdAt, p.updatedAt];
    if (includeOwners) row.push(p.owner?.name, p.owner?.phone, p.owner?.email);
    return row;
  });
  return "\uFEFF" + [heading, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
}
export function escapeReportHtml(value: unknown) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!); }
export function reportFilterSummary(filters: object, locale: ReportLocale) {
  const ar = locale === "ar";
  const names: Record<string, string> = { search: ar ? "البحث" : "Search", category: ar ? "الفئة" : "Category", listingType: ar ? "نوع العرض" : "Listing type", status: ar ? "الحالة" : "Status", propertyType: ar ? "نوع العقار" : "Property type", minPrice: ar ? "أقل سعر" : "Minimum price", maxPrice: ar ? "أعلى سعر" : "Maximum price", rooms: ar ? "أقل عدد غرف" : "Minimum rooms", location: ar ? "الموقع" : "Location", visibility: ar ? "الظهور" : "Visibility" };
  for (const group of dashboardFilterGroups) for (const field of group.fields) names[field.key] = ar ? field.ar : field.en;
  return Object.entries(filters).filter(([key, value]) => value !== "" && value !== undefined && value !== null && !["sortBy", "sortDir", "page", "limit"].includes(key)).map(([key, value]) => `${names[key] || key}: ${label(String(value), locale)}`).join(" · ") || (ar ? "جميع العقارات" : "All listings");
}
export const PRINT_COLUMNS = ["listing", "status", "visibility", "price", "location", "source"] as const;
export type PrintColumn = typeof PRINT_COLUMNS[number];
export type PrintOptions = {
  scale?: number; title?: string; orientation?: "portrait" | "landscape"; textSize?: "small" | "normal" | "large";
  density?: "compact" | "comfortable"; columns?: PrintColumn[]; showSummary?: boolean; showFilters?: boolean; showIds?: boolean;
};
export function selectedPrintColumns(options: PrintOptions): PrintColumn[] {
  const selected = options.columns ?? ["listing", "status", "price", "location"];
  return PRINT_COLUMNS.filter(column => selected.includes(column));
}
export function togglePrintColumn(options: PrintOptions, column: PrintColumn, checked: boolean): PrintOptions {
  const selected = new Set(selectedPrintColumns(options));
  if (checked) selected.add(column); else selected.delete(column);
  return { ...options, columns: PRINT_COLUMNS.filter(item => selected.has(item)) };
}
/** Allocate the paper width to selected columns using their actual text lengths. */
export function printColumnWidths(properties: PropertyDTO[], columns: PrintColumn[], includeOwners: boolean): number[] {
  const longest = (read: (property: PropertyDTO) => string) => Math.max(0, ...properties.map(property => Array.from(read(property)).length));
  const weight = (length: number, min: number, max: number) => Math.max(min, Math.min(max, Math.sqrt(length || 1) / 2));
  const weights: Record<PrintColumn, number> = {
    listing: 1.1, status: 1.3, visibility: 1.1,
    price: weight(longest(p => `${p.price ?? "Price on request"} SAR / ${p.rentalPeriod || ""}`), 1.4, 1.8),
    location: weight(longest(p => [p.location?.district, p.location?.city, p.location?.address].filter(Boolean).join(" ")), 1.8, 4.5),
    source: weight(longest(p => p.broughtBy?.name || ""), 1.6, 3),
  };
  const values = [weight(longest(p => p.title), 3, 6), ...columns.map(column => weights[column])];
  if (includeOwners) values.push(weight(longest(p => (p.owner?.name?.length || 0) >= (p.owner?.phone?.length || 0) ? p.owner?.name || "" : p.owner?.phone || ""), 1.5, 2.1));
  const total = values.reduce((sum, value) => sum + value, 0);
  const widths = values.map(value => Number((value / total * 100).toFixed(3)));
  widths[widths.length - 1] = Number((100 - widths.slice(0, -1).reduce((sum, value) => sum + value, 0)).toFixed(3));
  return widths;
}
export function dashboardPrintHtml(properties: PropertyDTO[], options: { locale: ReportLocale; includeOwners: boolean; filters: string; scope: string; generatedAt: Date; print?: PrintOptions }) {
  const { locale, includeOwners, filters, scope, generatedAt } = options; const ar = locale === "ar"; const e = escapeReportHtml;
  const custom = options.print || {};
  const orientation = custom.orientation === "portrait" ? "portrait" : "landscape";
  const scale = normalizePrintScale(custom.scale ?? 100);
  const fontSize = custom.textSize === "small" ? 10 : custom.textSize === "large" ? 12 : 11;
  const padding = custom.density === "compact" ? "7px 9px" : "12px 10px";
  const columns = selectedPrintColumns(custom);
  const columnWidths = printColumnWidths(properties, columns, includeOwners);
  const title = custom.title?.trim().slice(0, 120) || (ar ? "تقرير العقارات" : "Property listings report");
  const terms: Record<string, string> = { "property.priceOnRequest": ar ? "السعر عند الطلب" : "Price on request", "common.sar": ar ? "ريال" : "SAR", "form.monthly": ar ? "شهري" : "mo", "form.yearly": ar ? "سنوي" : "yr", "property.locationNotSpecified": ar ? "غير محدد" : "Not specified" };
  const t = (key: string) => terms[key] || key;
  const headings: Record<PrintColumn, string> = { listing: ar ? "العرض" : "Listing", status: ar ? "الحالة" : "Status", visibility: ar ? "الظهور" : "Visibility", price: ar ? "السعر" : "Price", location: ar ? "الموقع" : "Location", source: ar ? "مصدر العرض" : "Offer source" };
  const summary = ["total", "available", "sold", "rented"].map(status => `<div class="stat"><b>${status === "total" ? properties.length : properties.filter(p => p.status === status).length}</b><span>${status === "total" ? (ar ? "إجمالي العقارات" : "Total listings") : e(label(status, locale))}</span></div>`).join("");
  const rows = properties.map(p => {
    const location = formatLocation(p.location, t);
    const content: Record<PrintColumn, string> = {
      listing: e(label(p.listingType, locale)),
      status: `<span class="status">${e(label(p.status, locale))}</span>`,
      visibility: e(label(p.visibility, locale)),
      price: `<span class="price">${e(formatPriceWithPeriod(p.price, p.listingType, p.rentalPeriod, t, locale))}</span>`,
      location: `${e(location)}${p.location?.address ? `<small>${e(p.location.address)}</small>` : ""}`,
      source: e(p.broughtBy?.name || "—"),
    };
    const category = label(p.category === "apartment" ? p.propertyType || p.category : p.category, locale);
    return `<tr><td class="property"><strong>${e(p.title)}</strong><small>${e(category)}</small>${custom.showIds ? `<small class="reference" dir="ltr">${e(p._id)}</small>` : ""}</td>${columns.map(column => `<td>${content[column]}</td>`).join("")}${includeOwners ? `<td>${e(p.owner?.name || "—")}<small class="phone" dir="ltr">${e(p.owner?.phone)}</small></td>` : ""}</tr>`;
  }).join("");
  const html = `<!doctype html><html lang="${locale}" dir="${ar ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${e(title)} — 41 Real Estate</title><style>
@page{size:A4 ${orientation};margin:15mm 12mm}html{width:100%;margin:0;padding:0}*{box-sizing:border-box}body{font:${fontSize}pt Arial,Tahoma,sans-serif;line-height:1.65;color:#172936;margin:0;padding:0;width:100%;max-width:100%;background:#fff}header{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:2px solid #172936;padding-bottom:18px;margin-bottom:20px}.brand{display:flex;align-items:center;gap:10px}.brand-mark{border:1.5px solid #1d9bf0;border-radius:10px;padding:4px 10px;font-size:24pt;font-weight:700;line-height:1.3;color:#126ba0}.brand-name{font-size:11pt;font-weight:bold}.brand-name small{margin:0;font-size:9pt}.heading{margin:20px 0 15px}h1{font-size:23pt;line-height:1.5;margin:0 0 6px;overflow-wrap:anywhere}.meta{font-size:9pt;color:#4b5d6a}.summary{display:flex;border:1px solid #cbd6de;border-radius:8px;margin:18px 0 20px;break-inside:avoid}.stat{flex:1;min-width:0;overflow-wrap:anywhere;padding:10px 14px;border-inline-end:1px solid #dce5eb}.stat:last-child{border:0}.stat b{display:block;font-size:21pt;line-height:1.4}.stat span{font-size:9pt;color:#4b5d6a}.filters{padding:10px 14px;border-inline-start:3px solid #1d9bf0;background:#f5f8fa;margin-bottom:20px;font-size:9pt;line-height:1.8;overflow-wrap:anywhere}.filters b{display:block;margin-bottom:3px}table{width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th,td{padding:${padding};border-bottom:1px solid #cbd6de;text-align:start;vertical-align:top}th{border-top:1px solid #cbd6de;background:#eef3f6;color:#172936;font-size:9pt;font-weight:bold;overflow-wrap:anywhere}td{overflow-wrap:break-word;word-break:normal;white-space:normal;line-height:1.6}tbody tr:nth-child(even){background:#f8fafb}.property strong{font-size:${fontSize}pt;line-height:1.6;display:block}.price{font-weight:bold;line-height:1.7}.status{display:inline-block;border:1px solid #b8c7d2;border-radius:5px;padding:2px 7px;font-size:9pt;white-space:normal}small{display:block;color:#4b5d6a;margin-top:4px;font-size:9pt;line-height:1.6}.reference{overflow-wrap:anywhere;font-size:7.5pt;letter-spacing:.2px}.phone{unicode-bidi:isolate;overflow-wrap:anywhere}footer{margin-top:20px;padding-top:10px;border-top:1px solid #cbd6de;font-size:8pt;color:#4b5d6a}p{margin:0}header,.summary,thead,.filters{-webkit-print-color-adjust:exact;print-color-adjust:exact}
</style></head><body><header><div class="brand"><span class="brand-mark">41</span><div class="brand-name">${ar ? "41 للعقارات" : "41 Real Estate"}<small>${ar ? "تقرير داخلي للعقارات" : "Internal property report"}</small></div></div><div class="meta">${e(new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(generatedAt))}<br>${e(scope)}</div></header><div class="heading"><h1>${e(title)}</h1><p class="meta">${ar ? "عدد العقارات في هذا التقرير" : "Listings included in this report"}: ${properties.length} · ${ar ? "الأسعار بالريال السعودي" : "Prices in SAR"}</p></div>${custom.showSummary !== false ? `<div class="summary">${summary}</div>` : ""}${custom.showFilters !== false ? `<div class="filters"><b>${ar ? "الفلاتر المستخدمة" : "Applied filters"}</b>${e(filters)}</div>` : ""}<table><colgroup>${columnWidths.map(width => `<col style="width:${width}%">`).join("")}</colgroup><thead><tr><th>${ar ? "العقار" : "Property"}</th>${columns.map(column => `<th>${e(headings[column])}</th>`).join("")}${includeOwners ? `<th>${ar ? "المالك / الهاتف" : "Owner / phone"}</th>` : ""}</tr></thead><tbody>${rows}</tbody></table><footer>${ar ? "41 للعقارات · للاستخدام الداخلي · الأسعار والحالة كما في وقت إعداد التقرير." : "41 Real Estate · Internal use · Prices and availability reflect the time this report was prepared."}</footer></body></html>`;
  return html.replace(/<style>([\s\S]*?)<\/style>/, (_match, css: string) => `<style>${scaleReportCss(css, scale)}</style>`);
}
/** Fetch every matching page; never silently export a truncated or shifting result. */
export async function collectDashboardReport(fetchPage: (page: number) => Promise<Pick<PropertyListResponse, "data" | "total">>, max = 10000) {
  const rows: PropertyDTO[] = []; const ids = new Set<string>(); let expected: number | undefined;
  for (let page = 1; ; page++) {
    const result = await fetchPage(page);
    if (result.total > max) throw Error("limit");
    if (expected !== undefined && expected !== result.total) throw Error("changed");
    expected = result.total;
    if (!result.data.length && rows.length < expected) throw Error("changed");
    for (const row of result.data) { if (ids.has(row._id)) throw Error("changed"); ids.add(row._id); rows.push(row); }
    if (rows.length >= expected) { if (rows.length !== expected) throw Error("changed"); return rows; }
  }
}
