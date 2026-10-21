"use client";

import Link from "next/link";
import { Dropdown } from "@/components/ui/Dropdown";
import { CopyButton } from "@/components/ui/CopyButton";
import { Icon } from "@/components/ui/Icon";
import { propertyTextMessage } from "@/lib/property-message";
import { useState, useEffect } from "react";
import type { PropertyDTO, Visibility } from "@/types/property";
import { CategoryBadge } from "@/components/properties/CategoryBadge";
import { ListingTypeBadge } from "@/components/properties/ListingTypeBadge";
import { StatusBadge } from "@/components/properties/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate, formatLocation, formatPriceWithPeriod } from "@/lib/format";
import { deleteProperty, updateProperty } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useSession } from "next-auth/react";

export function ListingsTable({
  properties,
  publicOrigin,
  onDeleted,
  onVisibilityChanged,
}: {
  properties: PropertyDTO[];
  publicOrigin: string | null;
  onDeleted: (id: string) => void;
  onVisibilityChanged: (id: string, visibility: Visibility) => void;
}) {
  const { t, locale } = useLanguage();
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "admin";
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [selected, setSelected] = useState<string[]>([]);
  const [language, setLanguage] = useState<"ar" | "en">(locale);
  const [showImages, setShowImages] = useState(true);
  const [shareImages, setShareImages] = useState(false);
  useEffect(() => {
    try {
      setShowImages(localStorage.getItem("dashboard-show-images") !== "false");
      setShareImages(localStorage.getItem("dashboard-share-images") === "true");
    } catch { /* Storage may be disabled. */ }
  }, []);
  function imagePreference(kind: "show" | "share", enabled: boolean) {
    if (kind === "show") setShowImages(enabled); else setShareImages(enabled);
    try { localStorage.setItem(`dashboard-${kind}-images`, String(enabled)); } catch { /* Keep the current preference in memory. */ }
  }
  const shareable = properties.filter(p => p.visibility === "public");
  const chosen = shareable.filter(p => selected.includes(p._id));
  const allSelected = shareable.length > 0 && chosen.length === shareable.length;
  const message = publicOrigin ? chosen.map(p => {
    const images = shareImages ? p.images.filter(url => { try { return new URL(url).protocol === "https:"; } catch { return false; } }) : [];
    return propertyTextMessage(p, publicOrigin, language) + (images.length ? `\n\n📷 ${language === "ar" ? "صور العقار" : "Property photos"}:\n${images.join("\n")}` : "");
  }).join("\n\n━━━━━━━━━━━━━━━━━━━━\n\n") : "";
  function toggle(id: string) { setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]); }

  async function handleVisibilityToggle(p: PropertyDTO, visibility: Visibility) {
    const previous = p.visibility;
    onVisibilityChanged(p._id, visibility); // optimistic
    try {
      await updateProperty(p._id, {
        title: p.title,
        propertyType: p.propertyType,
        broughtByUserId: p.broughtBy?.userId,
        category: p.category,
        listingType: p.listingType,
        description: p.description,
        price: p.price,
        rentalPeriod: p.rentalPeriod,
        status: p.status,
        visibility,
        owner: p.owner,
        location: p.location,
        details: p.details,
        tenant: p.tenant,
        units: p.units,
        images: p.images,
        tiktokUrl: p.tiktokUrl,
      });
    } catch {
      onVisibilityChanged(p._id, previous); // revert on failure
    }
  }

  async function handleConfirmDelete() {
    if (!pendingId) return;
    setDeleting(true);
    try {
      await deleteProperty(pendingId);
      onDeleted(pendingId);
    } finally {
      setDeleting(false);
      setPendingId(null);
    }
  }

  return (
    <>
      <section aria-label={locale === "ar" ? "مشاركة العقارات" : "Share properties"} className="mb-4 rounded-2xl border border-ink-100 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="font-semibold text-ink-800">{locale === "ar" ? "حدد العقارات للمشاركة" : "Select properties to share"}</h2><p role="status" className="mt-1 text-sm text-ink-500">{chosen.length} {locale === "ar" ? "عقار محدد" : "selected"}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <Dropdown label={locale === "ar" ? `التحديد (${chosen.length})` : `Selection (${chosen.length})`}>
              <button type="button" disabled={!shareable.length || allSelected} className="btn-secondary" onClick={() => setSelected(shareable.map(p => p._id))}>{locale === "ar" ? "تحديد كل العقارات العامة في الصفحة" : "Select all public listings on this page"}</button>
              <button type="button" disabled={!shareable.length} className="btn-secondary" onClick={() => setSelected(shareable.filter(p => !selected.includes(p._id)).map(p => p._id))}>{locale === "ar" ? "عكس التحديد في الصفحة" : "Invert selection on this page"}</button>
              <button type="button" disabled={!chosen.length} className="btn-secondary" onClick={() => setSelected([])}>{locale === "ar" ? "إلغاء التحديد" : "Clear selection"}</button>
            </Dropdown>
            <Dropdown label={locale === "ar" ? "المشاركة والنسخ" : "Share & copy"}>
              <label className="text-xs font-semibold">{locale === "ar" ? "لغة الرسالة" : "Message language"}<select value={language} onChange={e => setLanguage(e.target.value as "ar" | "en")} className="input-field mt-2"><option value="ar">العربية</option><option value="en">English</option></select></label>
              <CopyButton text={message} label={locale === "ar" ? "نسخ العقارات المحددة" : "Copy selected properties"} />
              {message ? <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="btn-primary"><Icon name="whatsapp" className="h-4 w-4" />{locale === "ar" ? "مشاركة واتساب" : "Share on WhatsApp"}</a> : <button type="button" disabled className="btn-primary opacity-40">{locale === "ar" ? "مشاركة واتساب" : "Share on WhatsApp"}</button>}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" role="switch" checked={shareImages} onChange={e => imagePreference("share", e.target.checked)} />{locale === "ar" ? "تضمين روابط الصور" : "Include image links"}</label>

            </Dropdown>
            <Dropdown label={locale === "ar" ? "خيارات العرض" : "Display options"}>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" role="switch" checked={showImages} onChange={e => imagePreference("show", e.target.checked)} />{locale === "ar" ? "إظهار الصور في الجدول" : "Show table images"}</label>
            </Dropdown>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-500">{locale === "ar" ? "حدد من العقارات المعروضة. العقارات الخاصة غير قابلة للمشاركة. اختر المستلم أو المجموعة داخل واتساب." : "Select from the displayed listings. Private properties cannot be shared. Choose the recipient or group in WhatsApp."}</p>
        {!publicOrigin && <p role="alert" className="mt-2 text-sm text-red-700">{locale === "ar" ? "اضبط SITE_URL بعنوان الموقع العام لتفعيل المشاركة." : "Configure SITE_URL with the public website URL to enable sharing."}</p>}
        {message && <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium">{locale === "ar" ? "معاينة الرسالة" : "Preview message"}</summary><pre dir={language === "ar" ? "rtl" : "ltr"} className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-stone-50 p-4 font-sans text-sm">{message}</pre></details>}
        {message.length > 8000 && <p role="status" className="mt-2 text-xs text-ink-500">{locale === "ar" ? "الرسالة طويلة. إذا لم تفتح في واتساب، استخدم النسخ والصقها أو حدد عقارات أقل." : "This is a long message. If WhatsApp cannot open it, copy and paste it or select fewer listings."}</p>}
      </section>
      <div className="overflow-x-auto rounded-lg border border-ink-100 bg-white shadow-card">
        <table className="w-full min-w-[820px] text-start text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <th className="px-4 py-3 text-start font-semibold"><span className="sr-only">{locale === "ar" ? "تحديد العقار" : "Select property"}</span></th>
              {showImages && <th className="px-4 py-3 text-start font-semibold">{locale === "ar" ? "الصورة" : "Image"}</th>}
              <th className="px-4 py-3 text-start font-semibold">{t("dashboard.table.listing")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("dashboard.table.category")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("dashboard.table.listingType")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("dashboard.table.status")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("form.visibility")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("dashboard.table.price")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("dashboard.table.location")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("dashboard.table.updated")}</th>
              <th className="px-4 py-3 text-end font-semibold">{t("dashboard.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p._id} className={`border-b border-ink-50 last:border-0 hover:bg-stone-50 ${chosen.some(item => item._id === p._id) ? "bg-moss-50" : ""}`}>
                <td className="px-4 py-3"><input type="checkbox" checked={p.visibility === "public" && selected.includes(p._id)} disabled={p.visibility !== "public"} aria-label={`${locale === "ar" ? "تحديد" : "Select"} ${p.title}`} title={p.visibility === "private" ? (locale === "ar" ? "العقار خاص" : "Private property") : p.title} onChange={() => toggle(p._id)} className="h-4 w-4 accent-[#526d59]" /></td>
                {showImages && <td className="px-4 py-3"><Link href={`/properties/${p._id}`} aria-label={`${locale === "ar" ? "عرض صور" : "View photos of"} ${p.title}`} className="relative flex h-20 w-28 items-center justify-center overflow-hidden rounded-xl border border-ink-100 bg-stone-50">
                  {p.images[0] ? <ListingThumbnail url={p.images[0]} title={p.title} /> : <Icon name="home" className="h-6 w-6 text-ink-300" />}
                  {p.images.length > 1 && <span className="absolute bottom-1 end-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-ink-700">+{p.images.length - 1}</span>}
                </Link></td>}
                <td className="px-4 py-3">
                  <Link href={`/properties/${p._id}`} className="font-medium text-ink-800 hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <CategoryBadge category={p.category} propertyType={p.propertyType} />
                </td>
                <td className="px-4 py-3">
                  <ListingTypeBadge listingType={p.listingType} size="sm" />
                </td>
                <td className="px-4 py-3">
                  {p.status === "available" ? (
                    <span className="text-xs font-medium text-ink-400">{t("filters.available")}</span>
                  ) : (
                    <StatusBadge status={p.status} size="sm" />
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={p.visibility}
                    onChange={(e) => handleVisibilityToggle(p, e.target.value as Visibility)}
                    className={`rounded-full border-0 px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                      p.visibility === "public" ? "bg-moss-100 text-moss-600" : "bg-ink-100 text-ink-600"
                    }`}
                  >
                    <option value="public">{t("form.visibilityPublic")}</option>
                    <option value="private">{t("form.visibilityPrivate")}</option>
                  </select>
                </td>
                <td className="px-4 py-3 font-medium text-ink-700">
                  {formatPriceWithPeriod(p.price, p.listingType, p.rentalPeriod, t, locale)}
                </td>
                <td className="px-4 py-3 text-ink-500">{formatLocation(p.location, t)}</td>
                <td className="px-4 py-3 text-ink-400">{formatDate(p.updatedAt, locale)}</td>
                <td className="px-4 py-3">
                  <Dropdown label={t("dashboard.table.actions")}>
                    <Link href={`/properties/${p._id}`} className="btn-secondary">{locale === "ar" ? "عرض العقار" : "View property"}</Link>
                    <Link href={`/dashboard/${p._id}/edit`} className="btn-secondary"><Icon name="edit" className="h-4 w-4" />{t("common.edit")}</Link>
                    {isAdmin && <button type="button" onClick={() => setPendingId(p._id)} className="btn-danger"><Icon name="trash" className="h-4 w-4" />{t("common.delete")}</button>}
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(pendingId)}
        title={t("states.confirmDeleteTitle")}
        description={t("states.confirmDeleteDesc")}
        confirmLabel={t("states.confirmDeleteButton")}
        cancelLabel={t("common.cancel")}
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingId(null)}
      />
    </>
  );
}

function ListingThumbnail({ url, title }: { url: string; title: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Icon name="home" className="h-6 w-6 text-ink-300" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={title} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-contain" />;
}
