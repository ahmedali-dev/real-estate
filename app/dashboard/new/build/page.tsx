"use client";

import { BuildForm } from "@/components/forms/BuildForm";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useRequireRole } from "@/lib/auth/useRequireRole";

export default function NewBuildPage() {
  const { t } = useLanguage();
  const { ready } = useRequireRole(["admin", "real_estate_officer", "project_manager"], "/dashboard/new");

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-brass-600">
        {t("form.newEyebrow")}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800">
        {t("form.newBuildTitle")}
      </h1>
      <p className="mt-2 text-ink-500">{t("form.newBuildSubtitle")}</p>

      <div className="mt-8 rounded-lg border border-ink-100 bg-white p-6 shadow-card sm:p-8">
        <BuildForm />
      </div>
    </div>
  );
}
