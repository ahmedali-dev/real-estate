"use client";

import type { Category } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const MARK: Record<Category, string> = {
  build: "B",
  apartment: "A",
  land: "L",
};

export function CategoryBadge({ category }: { category: Category }) {
  const { t } = useLanguage();

  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 bg-white/90 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-700">
      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-ink-300 text-[9px] leading-none text-ink-500">
        {MARK[category]}
      </span>
      {t(`badges.category.${category}`)}
    </span>
  );
}
