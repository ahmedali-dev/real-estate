"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    clearTimeout(timer.current);
    try { await navigator.clipboard.writeText(text); setStatus("copied"); }
    catch { setStatus("failed"); }
    timer.current = setTimeout(() => setStatus("idle"), 3000);
  }
  return <span className="inline-flex flex-col items-end gap-1">
    <button type="button" onClick={copy} disabled={!text.trim()} aria-label={label} title={label} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ink-100 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-stone-50 disabled:opacity-40">
      <Icon name={status === "copied" ? "check" : "copy"} className="h-4 w-4" />{t(status === "copied" ? "common.copied" : "common.copy")}
    </button>
    <span role="status" className="text-xs text-ink-500">{status === "failed" ? t("common.copyFailed") : ""}</span>
  </span>;
}
