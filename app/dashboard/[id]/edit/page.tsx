"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ApartmentForm } from "@/components/forms/ApartmentForm";
import { BuildForm } from "@/components/forms/BuildForm";
import { LandForm } from "@/components/forms/LandForm";
import { ErrorState } from "@/components/ui/ErrorState";
import { fetchProperty, ApiClientError } from "@/lib/api-client";
import type { PropertyDTO } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useRequireRole } from "@/lib/auth/useRequireRole";

export default function EditListingPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const router = useRouter();
  const { ready } = useRequireRole(["admin", "real_estate_officer", "project_manager"], "/dashboard/orders");
  const params = useParams<{ id: string }>();
  const [property, setProperty] = useState<PropertyDTO | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ready">("loading");

  async function load() {
    setStatus("loading");
    try {
      const res = await fetchProperty(params.id);
      setProperty(res.data);
      setStatus("ready");
    } catch (err) {
      setStatus(err instanceof ApiClientError && err.status === 404 ? "notfound" : "error");
    }
  }

  useEffect(() => {
    if (!ready) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, ready]);

  useEffect(() => {
    // Project Managers only manage builds — bounce away from anything else
    // rather than showing a form whose save button will just 403.
    if (status === "ready" && property && session?.user.role === "project_manager" && property.category !== "build") {
      router.replace("/dashboard");
    }
  }, [status, property, session, router]);

  if (!ready) return null;

  const blockedForRole =
    status === "ready" && property && session?.user.role === "project_manager" && property.category !== "build";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-brass-600">
        {t("form.editEyebrow")}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800">
        {property ? property.title : t("form.editTitle")}
      </h1>

      <div className="mt-8">
        {status === "loading" && (
          <div className="animate-pulse rounded-lg border border-ink-100 bg-white p-8 shadow-card">
            <div className="h-6 w-1/3 rounded bg-stone-200" />
            <div className="mt-4 h-10 w-full rounded bg-stone-200" />
          </div>
        )}
        {status === "notfound" && (
          <p className="text-ink-500">{t("property.notFoundDesc")}</p>
        )}
        {status === "error" && <ErrorState onRetry={load} />}
        {status === "ready" && property && !blockedForRole && (
          <div className="rounded-lg border border-ink-100 bg-white p-6 shadow-card sm:p-8">
            {property.category === "apartment" && <ApartmentForm property={property} />}
            {property.category === "build" && <BuildForm property={property} />}
            {property.category === "land" && <LandForm property={property} />}
          </div>
        )}
      </div>
    </div>
  );
}
