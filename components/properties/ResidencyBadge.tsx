"use client";

import type { ResidencyType } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const LABEL_KEY: Record<ResidencyType, string> = {
  family: "form.residencyTypeFamily",
  singles: "form.residencyTypeSingles",
  women_only: "form.residencyTypeWomenOnly",
};

/**
 * Renders nothing when unset — this is an optional classification, not
 * every listing has one, so an absent badge should look identical to a
 * listing that never had this field at all.
 */
export function ResidencyBadge({
  residencyType,
  size = "md",
}: {
  residencyType?: ResidencyType;
  size?: "sm" | "md";
}) {
  const { t } = useLanguage();
  if (!residencyType) return null;

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-ink-100 font-semibold uppercase tracking-wider text-ink-600",
        sizeClasses,
      ].join(" ")}
    >
      {t(LABEL_KEY[residencyType])}
    </span>
  );
}
