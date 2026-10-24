"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Icon, type IconName } from "./Icon";
export function SiteHeader({ onMenuClick, staff = false }: { onMenuClick?: () => void; staff?: boolean }) {
  const { t, locale, setLocale } = useLanguage();
  const { data: session } = useSession();
  const pathname = usePathname();
  return <header className="estate-header sticky top-0 z-30">
    <div className="estate-header-inner">
      <Link href="/" className="estate-brand"><span className="estate-brand-mark">41</span><span><strong>{t("nav.brand")}</strong><small>{locale === "ar" ? "بيع وإيجار وإدارة أملاك" : "Buy, rent & property management"}</small></span></Link>
      {!staff && <nav className="estate-public-nav" aria-label={t("nav.browseSection")}>{[
        ["/", "nav.allListings", "grid"], ["/apartments", "nav.apartments", "home"], ["/builds", "nav.builds", "building"], ["/lands", "nav.lands", "land"],
      ].map(([href, key, icon]) => href === "/apartments" ? <details key={href} className="estate-nav-dropdown"><summary className={pathname === href ? "is-active" : ""}><Icon name="home" className="h-4 w-4" />{t(key)} <Icon name="chevronDown" className="estate-dropdown-chevron h-4 w-4" /></summary><div><Link href="/apartments"><Icon name="home" className="h-4 w-4" />{locale === "ar" ? "جميع الشقق" : "All apartments"}</Link><Link href="/apartments?listingType=sale"><Icon name="money" className="h-4 w-4" />{t("filters.forSale")}</Link><Link href="/apartments?listingType=rent"><Icon name="key" className="h-4 w-4" />{t("filters.forRent")}</Link></div></details> : <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon name={icon as IconName} className="h-4 w-4" />{t(key)}</Link>)}<a href="#office-contact"><Icon name="phone" className="h-4 w-4" />{locale === "ar" ? "اتصل بالمكتب" : "Contact office"}</a></nav>}
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setLocale(locale === "en" ? "ar" : "en")} className="btn-secondary estate-language" aria-label={locale === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}><Icon name="globe" className="h-4 w-4" />{locale === "en" ? "العربية" : "English"}</button>
        <Link href={session?.user ? "/dashboard" : "/login"} className="estate-staff-link"><Icon name={session?.user ? "grid" : "user"} className="h-4 w-4" />{session?.user ? t("nav.dashboard") : t("auth.staffSignIn")}</Link>
        <button type="button" onClick={onMenuClick} className="btn-secondary !px-3 lg:hidden" aria-label={t("nav.openMenu")}><Icon name="menu" className="h-5 w-5" /></button>
      </div>
    </div>
  </header>;
}
