"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useRequireRole } from "@/lib/auth/useRequireRole";

interface CategoryCard {
  href: string;
  titleKey: string;
  descKey: string;
  mark: string;
}

const CARDS: CategoryCard[] = [
  { href: "/dashboard/new/apartment", titleKey: "form.categoryApartment", descKey: "form.pickApartmentDesc", mark: "A" },
  { href: "/dashboard/new/build", titleKey: "form.categoryBuild", descKey: "form.pickBuildDesc", mark: "B" },
  { href: "/dashboard/new/land", titleKey: "form.categoryLand", descKey: "form.pickLandDesc", mark: "L" },
];

export default function NewListingPickerPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const { ready } = useRequireRole(["admin", "real_estate_officer", "project_manager"], "/dashboard/orders");

  if (!ready) return null;

  const isProjectManager = session?.user.role === "project_manager";
  const cards = isProjectManager ? CARDS.filter((c) => c.href.endsWith("/build")) : CARDS;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-brass-600">
        {t("form.newEyebrow")}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800">
        {t("form.pickCategoryTitle")}
      </h1>
      <p className="mt-2 text-ink-500">{t("form.pickCategorySubtitle")}</p>

      <div className={`mt-8 grid grid-cols-1 gap-5 ${cards.length > 1 ? "sm:grid-cols-3" : ""}`}>
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex flex-col items-start gap-3 rounded-lg border border-ink-100 bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-ink-800 font-display text-base font-semibold text-ink-800">
              {card.mark}
            </span>
            <h2 className="font-display text-lg font-semibold text-ink-800">{t(card.titleKey)}</h2>
            <p className="text-sm text-ink-500">{t(card.descKey)}</p>
            <span className="mt-auto text-sm font-semibold text-ink-800 group-hover:underline">
              {t("form.pickCategoryCta")} &rarr;
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
