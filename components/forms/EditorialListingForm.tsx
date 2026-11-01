"use client";

import { Children, useEffect, useRef, useState, type ReactNode, type FormEvent } from "react";
import type { ListingFormState } from "@/lib/forms/useListingFormState";
import type { Category } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatPriceWithPeriod } from "@/lib/format";

export function EditorialListingForm({ children, form, category, errors, submitError, submitting, isEdit, onSubmit, onCancel }: {
  children: ReactNode; form: ListingFormState; category: Category; errors: Record<string, string>;
  submitError: string | null; submitting: boolean; isEdit: boolean;
  onSubmit: (event: FormEvent) => void; onCancel: () => void;
}) {
  const { t, locale } = useLanguage();
  const ar = locale === "ar";
  const root = useRef<HTMLFormElement>(null);
  const [mediaPending, setMediaPending] = useState(false);
  const panels = Children.toArray(children);
  const sectionInfo: { label: string; hint: string; icon: IconName }[] = [
    { label: t("guided.essentials"), hint: ar ? "العنوان، نوع العرض والسعر والحالة" : "Title, offer type, price and availability", icon: "clipboard" },
    { label: category === "build" ? t("guided.apartments") : t("guided.details"), hint: ar ? category === "build" ? "تفاصيل المبنى والوحدات التابعة له" : "الغرف والخدمات والمميزات" : category === "build" ? "Building features and individual apartments" : "Rooms, facilities and features", icon: "building" },
    { label: t("guided.locationOwner"), hint: ar ? "حدد الموقع وأضف بيانات المالك إن توفرت" : "Location and optional owner contact information", icon: "location" },
    { label: t("guided.media"), hint: ar ? "صور العقار ورابط الفيديو" : "Property photos and video link", icon: "image" },
  ];
  const sections = panels.map((panel, index) => ({ panel, ...sectionInfo[index], sourceIndex: index })).filter(section => category !== "land" || section.sourceIndex !== 1);
  const price = formatPriceWithPeriod(form.hasPrice && form.price ? Number(form.price.replace(/,/g, "")) : undefined, form.listingType, form.rentalPeriod || undefined, t);

  useEffect(() => {
    const firstError = root.current?.querySelector<HTMLElement>(".field-error");
    if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [errors]);

  return <form ref={root} className="guided-listing editorial-listing listing-form composer-form" onSubmit={event => {
    if (root.current?.querySelector('[aria-busy="true"]')) {
      event.preventDefault();
      setMediaPending(true);
      return;
    }
    setMediaPending(false);
    onSubmit(event);
  }}>
    <nav className="composer-navigation" aria-label={ar ? "أقسام نموذج العقار" : "Property form sections"}>
      {sections.map((section, index) => <a href={`#listing-section-${section.sourceIndex}`} key={section.sourceIndex}><span>{index + 1}</span><Icon name={section.icon} className="h-4 w-4" />{section.label}</a>)}
    </nav>
    <div className="guided-main">
      {mediaPending && <p role="alert" className="mb-4 rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-600">{t("form.uploading")}</p>}
      {submitError && <div role="alert" className="mb-5 rounded-lg border border-rust-500/30 bg-rust-50 p-4 text-sm text-rust-600">{submitError}</div>}
      {sections.map((section, index) => <section key={section.sourceIndex} id={`listing-section-${section.sourceIndex}`} data-guided-step={section.sourceIndex} className="guided-panel"><header><span className="composer-section-icon"><Icon name={section.icon} /></span><div><span className="composer-section-number">{ar ? "القسم" : "SECTION"} {String(index + 1).padStart(2, "0")}</span><h2>{section.label}</h2><p className="composer-section-hint">{section.hint}</p></div></header><div className="composer-section-content">{section.panel}</div></section>)}
      <div className="guided-actions"><span className="composer-save-note"><Icon name="check" className="h-4 w-4" />{ar ? "راجع التفاصيل قبل الحفظ" : "Review your details before saving"}</span><button type="button" className="btn-secondary" disabled={submitting} onClick={onCancel}>{t("form.cancel")}</button><button type="submit" className="btn-primary" disabled={submitting}>{submitting ? t("form.saving") : isEdit ? t("form.saveChanges") : t("form.createListing")}</button></div>
    </div>
    <aside className="guided-summary"><p className="guided-summary-label">{ar ? "معاينة العقار" : "LISTING PREVIEW"}</p><div className="guided-illustration"><Icon name={category === "build" ? "building" : category === "land" ? "land" : "home"} className="h-16 w-16" /></div><h3>{form.title || t("guided.untitled")}</h3><p className="mt-2 text-xs text-slate-500">{category === "apartment" ? t(`offer.types.${form.propertyType}`) : t(`badges.category.${category}`)} · {t(`badges.listingType.${form.listingType}`)}</p><hr /><span className="composer-price-label">{ar ? "السعر" : "Price"}</span><strong>{price}</strong><dl><div><dt>{t("property.availability")}</dt><dd>{t(`badges.status.${form.status}`)}</dd></div><div><dt>{t("form.visibility")}</dt><dd>{t(form.visibility === "public" ? "form.visibilityPublic" : "form.visibilityPrivate")}</dd></div>{category === "build" && <div><dt>{t("guided.apartments")}</dt><dd>{form.units.length}</dd></div>}</dl></aside>
  </form>;
}
