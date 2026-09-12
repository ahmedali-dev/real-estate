"use client";

import type { ListingStatus } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/**
 * Renders nothing for "available" (the default, expected state) so normal
 * listings stay uncluttered. Sold/rented listings get a solid, unmistakable
 * badge since that's the state a viewer most needs to notice at a glance.
 */
export function StatusBadge({
  status,
  size = "md",
}: {
  status: ListingStatus;
  size?: "sm" | "md";
}) {
  const { t } = useLanguage();
  if (status === "available") return null;

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-ink-800 font-bold uppercase tracking-wider text-stone-50",
        sizeClasses,
      ].join(" ")}
    >
      {t(`badges.status.${status}`)}
    </span>
  );
}
