import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePrintScale, scaleReportCss, createPrintService } from "../lib/print-service";

test("print scale defaults safely and clamps custom values", () => {
  for (const value of [undefined, null, "", NaN, Infinity, "invalid"]) assert.equal(normalizePrintScale(value), 100);
  assert.equal(normalizePrintScale(25), 50); assert.equal(normalizePrintScale(500), 150);
  assert.equal(normalizePrintScale(84.7), 85); assert.equal(normalizePrintScale("110"), 110);
});
test("print service reserves a full-page preview and never constrains it to frame dimensions", async () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, "window");
  let calls = 0; let fail = false; let blocked = false; let markup = ""; let css = ""; let release!: () => void;
  const fonts = new Promise<void>(resolve => { release = resolve; });
  const controls: { button?: { onclick?: () => void } } = {};
  const target = { closed: false, opener: {} as unknown, focus() {}, print() { if (fail) throw Error("Print blocked"); calls++; }, close() { this.closed = true; }, document: {
    title: "", open() {}, write(html: string) { markup = html; }, close() {}, fonts: { ready: fonts },
    createElement(tag: string) { const element = { textContent: "", className: "", type: "", onclick: undefined as undefined | (() => void), appendChild(child: { onclick?: () => void }) { controls.button = child; } }; if (tag === "button") controls.button = element; return element; },
    head: { appendChild(style: { textContent: string }) { css = style.textContent; } }, body: { textContent: "", prepend() {} }
  } };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { open() { target.closed = false; return blocked ? null : target; } } });
  try {
    const service = createPrintService(); service.prepare("Preparing report"); assert.equal(target.opener, null);
    const printing = service.print("<html>Report</html>", { title: "Report" }); await Promise.resolve(); assert.equal(calls, 0);
    release(); await printing; assert.equal(calls, 1); assert.equal(markup, "<html>Report</html>"); assert.ok(css.includes("width:auto!important")); assert.ok(css.includes("overflow:visible!important")); assert.equal(css.includes("1120px"), false);
    assert.equal(service.refresh("<html>Updated selected columns</html>"), true);
    assert.equal(markup, "<html>Updated selected columns</html>"); assert.equal(calls, 1);
    controls.button?.onclick?.(); assert.equal(calls, 2); assert.equal(target.closed, false);
    fail = true; service.prepare("Report"); await assert.rejects(service.print("report", { title: "Report" }), /Print blocked/); assert.equal(target.closed, true);
    fail = false; assert.equal(service.refresh("closed"), false); blocked = true; assert.throws(() => service.prepare("Report"), /PopupBlocked/);
    blocked = false; service.prepare("Report"); service.dispose(); assert.equal(target.closed, true);
    service.prepare("Report"); const cancel = new AbortController(); const pending = service.print("report", { title: "Report", signal: cancel.signal }); const cancelled = assert.rejects(pending, { name: "AbortError" }); cancel.abort(); await cancelled; assert.equal(target.closed, true);
  } finally { if (old) Object.defineProperty(globalThis, "window", old); else Reflect.deleteProperty(globalThis, "window"); }
});

test("report scaling preserves printable page bounds and percentage widths", () => {
  const css = "@page{size:A4 portrait;margin:15mm 12mm}body{font:12pt Arial}td{padding:10px;width:30%}";
  const scaled = scaleReportCss(css, 150);
  assert.ok(scaled.includes("margin:15mm 12mm")); assert.ok(scaled.includes("font:18pt"));
  assert.ok(scaled.includes("padding:15px;width:30%")); assert.equal(scaled.includes("zoom"), false);
});
