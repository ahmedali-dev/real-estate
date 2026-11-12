/** Shared browser printing service. Call only with application-generated, escaped HTML. */
export function normalizePrintScale(value: unknown): number {
  if (value === undefined || value === null || value === "") return 100;
  const scale = typeof value === "number" ? value : Number(value);
  return Number.isFinite(scale) ? Math.min(150, Math.max(50, Math.round(scale))) : 100;
}
/** Scale text and spacing, while keeping paper size and column widths unchanged. */
export function scaleReportCss(css: string, percent: unknown) {
  const factor = normalizePrintScale(percent) / 100;
  return css.replace(/(\d*\.?\d+)(pt|px)\b/g, (_match, value: string, unit: string) => `${Number((Number(value) * factor).toFixed(3))}${unit}`);
}
export function createPrintService() {
  let preview: Window | null = null;
  let cancel: (() => void) | null = null;
  let preparing = false;
  function dispose() { cancel?.(); cancel = null; preview?.close(); preview = null; }
  /** Reserve the tab during the user's click, before fetching report data. */
  function prepare(title: string) {
    if (preparing) throw Error("A print report is already being prepared.");
    dispose();
    preview = window.open("about:blank", "_blank");
    if (!preview) throw Error("PopupBlocked");
    preview.opener = null;
    preview.document.title = title;
    preview.document.body.textContent = title;
  }
  let lastButtonLabel = "Print / Save PDF";
  function render(target: Window, html: string, buttonLabel: string) {
      target.document.open(); target.document.write(html); target.document.close();
      // A top-level document lets the browser paginate against paper, rather
      // than retaining an embedded frame's fixed screen width.
      const style = target.document.createElement("style");
      style.textContent = ".estate-print-controls{display:flex;justify-content:flex-end;gap:12px;padding:16px;margin-bottom:20px;border-bottom:1px solid #dce5eb}.estate-print-controls button{padding:10px 20px;border:0;border-radius:8px;background:#172936;color:white;font:14px Arial;cursor:pointer}@media print{.estate-print-controls{display:none!important}html,body{width:auto!important;max-width:none!important;min-width:0!important;height:auto!important;overflow:visible!important}table{width:100%!important;max-width:100%!important}th,td{min-width:0!important;overflow-wrap:anywhere!important}header>*{min-width:0}}";
      target.document.head.appendChild(style);
      const controls = target.document.createElement("nav"); controls.className = "estate-print-controls";
      const button = target.document.createElement("button"); button.type = "button"; button.textContent = buttonLabel;
      button.onclick = () => { target.focus(); target.print(); };
      controls.appendChild(button); target.document.body.prepend(controls);
  }
  /** Update an open report after dashboard options change, without reopening printing. */
  function refresh(html: string) {
    if (!preview || preview.closed || preparing) return false;
    try { render(preview, html, lastButtonLabel); return true; }
    catch { preview = null; return false; }
  }
  async function print(html: string, options: { title: string; signal?: AbortSignal; buttonLabel?: string }) {
    if (preparing) throw Error("A print report is already being prepared.");
    options.signal?.throwIfAborted();
    if (!preview || preview.closed) throw Error("Print preview was closed. Try again.");
    const target = preview; preparing = true;
    try {
      lastButtonLabel = options.buttonLabel || "Print / Save PDF";
      render(target, html, lastButtonLabel);
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => finish(Error("Print document timed out.")), 15000);
        function finish(error?: Error) {
          if (settled) return; settled = true; clearTimeout(timeout);
          options.signal?.removeEventListener("abort", abort); cancel = null;
          if (error) reject(error); else resolve();
        }
        function abort() { finish(new DOMException("Print cancelled.", "AbortError")); }
        cancel = abort; options.signal?.addEventListener("abort", abort, { once: true });
        Promise.resolve(target.document.fonts?.ready).then(() => finish(), () => finish(Error("Could not prepare print fonts.")));
        if (options.signal?.aborted) abort();
      });
      options.signal?.throwIfAborted();
      if (target.closed) throw Error("Print preview was closed. Try again.");
      target.focus(); target.print();
    } catch (error) { target.close(); throw error; }
    finally { preparing = false; if (target.closed) preview = null; }
  }
  return { prepare, print, refresh, dispose };
}
