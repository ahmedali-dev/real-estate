"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function SiteHeader() {
  const { t, locale, setLocale } = useLanguage();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-100 bg-stone-50/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-sm border-2 border-ink-800 font-display text-sm font-semibold text-ink-800">
            M
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-ink-800">
            {t("nav.brand")}
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-ink-600 transition hover:bg-ink-50 hover:text-ink-800"
          >
            {t("nav.browse")}
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-ink-600 transition hover:bg-ink-50 hover:text-ink-800"
          >
            {t("nav.dashboard")}
          </Link>
          <Link
            href="/dashboard/new"
            className="ms-2 rounded-md bg-ink-800 px-3.5 py-2 text-stone-50 transition hover:bg-ink-700"
          >
            {t("nav.addListing")}
          </Link>
          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className="ms-2 rounded-md border border-ink-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-600 transition hover:border-ink-400 hover:bg-stone-50"
            aria-label="Toggle language"
          >
            {locale === "en" ? "العربية" : "English"}
          </button>
        </nav>
      </div>
    </header>
  );
}
