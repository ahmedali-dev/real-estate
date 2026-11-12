import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, dashboardCsv, dashboardPrintHtml, collectDashboardReport, reportFilterSummary, selectedPrintColumns, togglePrintColumn, printColumnWidths, PRINT_COLUMNS, type PrintOptions } from "../lib/dashboard-export";
import type { PropertyDTO } from "../types/property";
const property = (id: string): PropertyDTO => ({ _id: id, title: 'Home, "test"', description: "=HYPERLINK(\"bad\")", category: "apartment", listingType: "sale", status: "available", visibility: "private", price: 120000, owner: { name: "PRIVATE_OWNER", phone: "+966555123456" }, tenant: { idNumber: "PRIVATE_TENANT_ID" }, units: [], images: [], createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z" });
test("CSV handles Arabic, quoting, formula injection, and opt-in owner contacts", () => {
  assert.equal(csvCell('=1+1'), '"\'=1+1"'); assert.equal(csvCell(' +1'), '"\' +1"'); assert.equal(csvCell('hello,"world"'), '"hello,""world"""');
  const csv = dashboardCsv([property("1")], "ar"); assert.ok(csv.startsWith("\uFEFF")); assert.ok(csv.includes("معرف العقار")); assert.ok(csv.includes("'=")); assert.equal(csv.includes("PRIVATE_OWNER"), false); assert.equal(csv.includes("PRIVATE_TENANT_ID"), false);
  const withOwner = dashboardCsv([property("1")], "en", true); assert.ok(withOwner.includes("PRIVATE_OWNER")); assert.ok(withOwner.includes("'+966"));
});
test("print report escapes user HTML, respects RTL, and excludes private contacts by default", () => {
  const row = { ...property("1"), title: '<script>alert("x")</script>' };
  const html = dashboardPrintHtml([row], { locale: "ar", includeOwners: false, filters: '<img src=x onerror="bad">', scope: "All", generatedAt: new Date("2026-11-01T00:00:00Z") });
  assert.ok(html.includes('dir="rtl"')); assert.ok(html.includes("&lt;script&gt;")); assert.equal(html.includes("<script>"), false); assert.equal(html.includes("<img"), false); assert.equal(html.includes("PRIVATE_OWNER"), false); assert.ok(html.includes("120"));
  assert.ok(reportFilterSummary({ status: "rented", city: "Riyadh" }, "ar").includes("مؤجر"));
});
test("report exports all result pages and rejects truncation or shifting results", async () => {
  const called: number[] = [];
  const rows = await collectDashboardReport(async page => { called.push(page); return { data: page === 1 ? [property("1"), property("2")] : [property("3")], total: 3 }; });
  assert.deepEqual(called, [1, 2]); assert.deepEqual(rows.map(row => row._id), ["1", "2", "3"]);
  await assert.rejects(() => collectDashboardReport(async () => ({ data: [], total: 10001 })), /limit/);
  await assert.rejects(() => collectDashboardReport(async page => ({ data: [property(String(page))], total: page === 1 ? 2 : 3 })), /changed/);
  await assert.rejects(() => collectDashboardReport(async () => ({ data: [property("1")], total: 2 })), /changed/);
  assert.deepEqual(await collectDashboardReport(async () => ({ data: [], total: 0 })), []);
});
test("print customization controls columns, title, spacing, summaries and IDs", () => {
  const row = { ...property("listing-reference-123"), location: { city: "Riyadh" }, broughtBy: { userId: "1", name: "Offer source name" } };
  const options = { locale: "en" as const, includeOwners: true, filters: "FILTER_MARKER", scope: "Current page", generatedAt: new Date("2026-11-01T00:00:00Z"), print: { title: '<img src=x> Custom report', orientation: "portrait" as const, textSize: "large" as const, density: "compact" as const, columns: ["price" as const], showSummary: false, showFilters: false, showIds: false } };
  const html = dashboardPrintHtml([row], options);
  assert.ok(html.includes("size:A4 portrait")); assert.ok(html.includes("font:12pt")); assert.ok(html.includes("padding:7px 9px")); assert.ok(html.includes("&lt;img src=x&gt; Custom report"));
  assert.equal(html.includes('<div class="summary">'), false); assert.equal(html.includes("FILTER_MARKER"), false); assert.equal(html.includes("listing-reference-123"), false); assert.equal(html.includes("Riyadh"), false); assert.equal(html.includes("Offer source name"), false); assert.ok(html.includes("PRIVATE_OWNER"));
  const detailed = dashboardPrintHtml([row], { ...options, print: { columns: ["location", "source"], showIds: true } });
  assert.ok(detailed.includes("Riyadh")); assert.ok(detailed.includes("listing-reference-123")); assert.ok(detailed.includes("Offer source name"));
});
test("print scale is applied to the whole report and cannot inject CSS", () => {
  const options = { locale: "en" as const, includeOwners: false, filters: "All", scope: "All", generatedAt: new Date(), print: { scale: 85 } };
  const scaled = dashboardPrintHtml([property("1")], options);
  assert.ok(scaled.includes("font:9.35pt"));
  assert.equal(scaled.includes("zoom:"), false);
  assert.ok(scaled.includes("size:A4 landscape;margin:15mm 12mm"));
  assert.ok(scaled.includes("max-width:100%"));
  assert.ok(dashboardPrintHtml([property("1")], { ...options, print: { scale: 200 } }).includes("font:16.5pt"));
  assert.ok(dashboardPrintHtml([property("1")], { ...options, print: { scale: NaN } }).includes("font:11pt"));
});

test("column toggles preserve successive changes and can select none or reselect a column", () => {
  let options: PrintOptions = {};
  options = togglePrintColumn(options, "price", false);
  options = togglePrintColumn(options, "location", false);
  options = togglePrintColumn(options, "source", true);
  assert.deepEqual(selectedPrintColumns(options), ["listing", "status", "source"]);
  options = togglePrintColumn(options, "source", true);
  assert.equal(selectedPrintColumns(options).filter(column => column === "source").length, 1);
  for (const column of PRINT_COLUMNS) options = togglePrintColumn(options, column, false);
  assert.deepEqual(selectedPrintColumns(options), []);
  const base = { locale: "en" as const, includeOwners: false, filters: "All", scope: "All", generatedAt: new Date(), print: options };
  const headers = (html: string) => html.match(/<thead>[\s\S]*?<\/thead>/)?.[0] || "";
  assert.equal(headers(dashboardPrintHtml([property("1")], base)), "<thead><tr><th>Property</th></tr></thead>");
  options = togglePrintColumn(options, "price", true);
  const printed = headers(dashboardPrintHtml([property("1")], { ...base, print: options }));
  assert.equal(printed, "<thead><tr><th>Property</th><th>Price</th></tr></thead>");
});

test("printed column widths fit their content within the printable page", () => {
  const row = { ...property("1"), title: "A spacious apartment with a long property title and full details", location: { city: "Riyadh", address: "A detailed street address for the selected property" } };
  const widths = printColumnWidths([row], ["status", "price", "location"], false);
  assert.equal(widths.length, 4); assert.ok(widths[0] > widths[1]);
  assert.ok(Math.abs(widths.reduce((sum, width) => sum + width, 0) - 100) < .001);
  assert.deepEqual(printColumnWidths([row], [], false), [100]);
  assert.equal(printColumnWidths([row], ["price"], true).length, 3);
  const html = dashboardPrintHtml([row], { locale: "en", includeOwners: false, filters: "All", scope: "All", generatedAt: new Date(), print: { columns: ["status", "price", "location"] } });
  assert.ok(html.includes("<colgroup>")); assert.ok(html.includes(`width:${widths[0]}%`)); assert.ok(html.includes("word-break:normal")); assert.ok(html.includes("white-space:normal"));
});
