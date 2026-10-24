"use client";

import type { ListingStatus } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/** Status always has a text label and a distinct semantic color. */
export function StatusBadge({
  status,
  size = "md",
}: {
  status: ListingStatus;
  size?: "sm" | "md";
}) {
  const { t } = useLanguage();

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={[
        `estate-status estate-status-${status} inline-flex items-center gap-1.5 rounded-full font-semibold`,
        sizeClasses,
      ].join(" ")}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />{t(`badges.status.${status}`)}
    </span>
  );
}
