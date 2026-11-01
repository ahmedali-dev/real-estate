"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Icon, type IconName } from "./Icon";

export function MobileDock() {
  const pathname = usePathname();
  const { status } = useSession();
  const { t, locale } = useLanguage();
  const signedIn = status === "authenticated";
  const items: { href: string; label: string; icon: IconName }[] = [
    { href: "/", label: locale === "ar" ? "الرئيسية" : "Home", icon: "grid" },
    { href: "/apartments", label: t("nav.apartments"), icon: "home" },
    { href: "/builds", label: locale === "ar" ? "المباني" : "Buildings", icon: "building" },
    { href: "/lands", label: t("nav.lands"), icon: "land" },
    { href: signedIn ? "/dashboard" : "/login", label: signedIn ? t("nav.dashboard") : locale === "ar" ? "دخول" : "Sign in", icon: signedIn ? "clipboard" : "user" },
  ];
  return <nav className="estate-mobile-dock" aria-label={locale === "ar" ? "التنقل الرئيسي للجوال" : "Mobile primary navigation"}>
    {items.map(item => {
      const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
      return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className="estate-dock-item">
        <span className="estate-dock-icon"><Icon name={item.icon} className="h-5 w-5" /></span>
        <span className="estate-dock-label">{item.label}</span>
      </Link>;
    })}
  </nav>;
}
