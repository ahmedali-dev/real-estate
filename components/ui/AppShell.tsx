"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { SidebarNav } from "./Sidebar";
import { OFFICE_PHONE_NUMBERS, officeWhatsAppLink, officeCallLink } from "@/lib/config/office";
import { SiteHeader } from "./SiteHeader";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { t, locale } = useLanguage();
  const staff = pathname.startsWith("/dashboard");
  const contentRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const content = contentRef.current;
    content?.setAttribute("inert", "");
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]') ?? []);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    const onResize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener("resize", onResize);
    return () => {
      content?.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      previousFocus?.focus();
    };
  }, [mobileOpen]);

  // Close the mobile drawer automatically whenever navigation happens.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className={`estate-shell flex min-h-screen ${staff ? "estate-workspace" : "estate-public"}`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:p-3">{t("nav.skipContent")}</a>
      {staff && <aside className="estate-sidebar hidden w-64 flex-shrink-0 border-e lg:block">
        <div className="sticky top-0 h-screen"><SidebarNav /></div>
      </aside>}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-900/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div ref={drawerRef} role="dialog" aria-modal="true" aria-label={t("nav.browseSection")} className="estate-mobile-drawer absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <button type="button" onClick={() => setMobileOpen(false)} className="m-4 mb-0 self-end rounded-lg border border-ink-100 px-3 py-2 text-sm font-semibold">{t("nav.closeMenu")}</button>
            <div className="min-h-0 flex-1"><SidebarNav onNavigate={() => setMobileOpen(false)} /></div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col" ref={contentRef}>
        <SiteHeader onMenuClick={() => setMobileOpen(true)} staff={staff} />
        <main id="main-content" tabIndex={-1} className={`min-h-[calc(100vh-64px)] flex-1 ${/^\/properties\/[^/]+\/?$/.test(pathname) ? "editorial-page-background" : ["/", "/apartments", "/builds", "/lands"].includes(pathname) ? "courtyard-page-background" : ""}`}>{children}</main>
        {!staff && <footer id="office-contact" className="estate-footer"><div><span className="estate-eyebrow">41 REAL ESTATE</span><h2>{locale === "ar" ? "عقارك القادم يبدأ بمحادثة." : "Your next place starts with a conversation."}</h2><p>{locale === "ar" ? "تواصل مع مكتبنا للمساعدة في البيع والإيجار وإدارة الأملاك." : "Talk to our office about buying, renting, and property management."}</p></div><div className="flex flex-wrap gap-3"><a className="btn-primary" href={officeWhatsAppLink(OFFICE_PHONE_NUMBERS[0])} target="_blank" rel="noopener noreferrer">{locale === "ar" ? "تواصل عبر واتساب" : "Chat on WhatsApp"}</a><a className="btn-secondary" href={officeCallLink(OFFICE_PHONE_NUMBERS[0])}>{locale === "ar" ? "اتصل بالمكتب" : "Call the office"}</a></div></footer>}
      </div>
    </div>
  );
}
