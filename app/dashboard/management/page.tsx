"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { useRequireRole } from "@/lib/auth/useRequireRole";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { type ManagedListing } from "@/lib/property-management";

export default function ManagementPage() {
  return <Suspense><ManagementWorkspace /></Suspense>;
}

function ManagementWorkspace() {
  const { status, role } = useRequireRole(["admin", "real_estate_officer", "project_manager"], "/dashboard/orders");
  const { locale, t } = useLanguage();
  const ar = locale === "ar";
  const tr = (en: string, arabic: string) => ar ? arabic : en;
  const router = useRouter();
  const propertyId = useSearchParams().get("property");
  const [mode, setMode] = useState("managed");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [rows, setRows] = useState<ManagedListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const allowed = status === "authenticated" && (role === "admin" || role === "real_estate_officer" || role === "project_manager");
  const categories = role === "project_manager" ? ["build"] : ["build", "land", "apartment"];

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ mode, category, search, page: String(page) });
    setLoading(true); setFailed(false);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/property-management?${params}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (!controller.signal.aborted) { setRows(result.data); setTotal(result.total); }
      } catch { if (!controller.signal.aborted) setFailed(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [allowed, mode, category, search, page, version]);

  useEffect(() => {
    if (allowed && propertyId && /^[a-f\d]{24}$/i.test(propertyId)) router.replace(`/dashboard/management/${propertyId}`);
  }, [allowed,propertyId,router]);

  if (!allowed) return null;
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
    <header className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
      <span className="mb-4 inline-flex rounded-2xl bg-brass-100 p-3 text-brass-600"><Icon name="key" /></span>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t("nav.management")}</h1>
      <p className="mt-2 text-sm text-ink-500">{tr("Manage agreements, leases, income, expenses, and private documents.", "أدر الاتفاقيات وعقود الإيجار والإيرادات والمصروفات والمستندات الخاصة.")}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link className="btn-primary" href="/dashboard/management/reports"><Icon name="clipboard" />{tr("Reports & reminders", "التقارير والتذكيرات")}</Link>
        {categories.map(key => <Link key={key} className="btn-secondary" href={`/dashboard/new/${key}?manage=1`}>{tr("New", "إضافة")} {t(`badges.category.${key}`)}</Link>)}
      </div>
    </header>
    <section className="rounded-2xl border border-ink-100 bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap gap-2">
        {[["managed", tr("Managed properties", "العقارات المُدارة")], ["all", tr("Choose existing property", "اختيار عقار موجود")]].map(([value, label]) =>
          <button key={value} type="button" aria-pressed={mode === value} className={mode === value ? "btn-primary" : "btn-secondary"} onClick={() => { setMode(value); setPage(1); }}>{label}</button>)}
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_200px]">
        <input className="input-field" type="search" value={search} aria-label={tr("Search properties", "البحث عن عقار")} placeholder={tr("Search by property title…", "ابحث بعنوان العقار…")} onChange={event => { setSearch(event.target.value); setPage(1); }} />
        {categories.length > 1 && <SelectDropdown className="input-field" aria-label={tr("Category", "الفئة")} value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}>
          <option value="">{tr("All categories", "كل الفئات")}</option>
          {categories.map(key => <option key={key} value={key}>{t(`badges.category.${key}`)}</option>)}
        </SelectDropdown>}
      </div>
      {loading ? <p role="status">{tr("Loading properties…", "جارٍ تحميل العقارات…")}</p> : failed ? <div role="alert">{tr("Could not load properties.", "تعذر تحميل العقارات.")} <button className="underline" onClick={() => setVersion(value => value + 1)}>{tr("Retry", "إعادة المحاولة")}</button></div> : rows.length === 0 ? <p className="rounded-xl bg-stone-50 p-4 text-sm text-ink-500">{tr("No properties found. Choose an existing property or create a new one.", "لا توجد عقارات مطابقة. اختر عقارًا موجودًا أو أضف عقارًا جديدًا.")}</p> :
        <ul className="divide-y divide-ink-100">{rows.map(property => <li key={property._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="min-w-0">
            <Link href={`/properties/${property._id}`} className="break-words font-semibold hover:underline">{property.title}</Link>
            <p className="mt-1 text-xs text-ink-500">{t(`badges.category.${property.category}`)} · {t(`badges.listingType.${property.listingType}`)} · {t(`badges.status.${property.status}`)}</p>
          </div>
          <Link className="btn-primary" href={`/dashboard/management/${property._id}`}>{tr("Open management workspace", "فتح ملف إدارة العقار")}</Link>
        </li>)}</ul>}
      {!loading && !failed && total > 20 && <div className="mt-4 flex items-center justify-between gap-2">
        <button type="button" className="btn-secondary" disabled={page === 1} onClick={() => setPage(value => value - 1)}>{t("courtyard.previous")}</button>
        <span>{page} / {Math.ceil(total / 20)}</span>
        <button type="button" className="btn-secondary" disabled={page * 20 >= total} onClick={() => setPage(value => value + 1)}>{t("courtyard.next")}</button>
      </div>}
    </section>
  </div>;
}
