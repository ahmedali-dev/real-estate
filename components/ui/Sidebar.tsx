"use client";

import { Icon, type IconName } from "./Icon";
import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { UserRole } from "@/types/user";

const LISTINGS_ROLES: UserRole[] = ["admin", "real_estate_officer", "project_manager"];
const ORDERS_ROLES: UserRole[] = ["admin", "sales_officer"];

function roleLabelKey(role: UserRole): string {
  switch (role) {
    case "admin":
      return "users.roleAdmin";
    case "real_estate_officer":
      return "users.roleRealEstateOfficer";
    case "sales_officer":
      return "users.roleSalesOfficer";
    case "project_manager":
      return "users.roleProjectManager";
    default:
      // Defensive fallback: a session issued before a role rename (or any
      // other unrecognized value) should never crash the page — just show
      // something sensible until the user signs in again with a fresh role.
      return "users.roleUnknown";
  }
}

interface NavItem {
  href: string;
  labelKey: string;
  mark: IconName;
}

const BROWSE_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.allListings", mark: "grid" },
  { href: "/apartments", labelKey: "nav.apartments", mark: "home" },
  { href: "/builds", labelKey: "nav.builds", mark: "building" },
  { href: "/lands", labelKey: "nav.lands", mark: "land" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/dashboard") {
    // Avoid double-highlighting Dashboard when a more specific admin route
    // (like /dashboard/orders) has its own nav entry.
    return (
      pathname === "/dashboard" ||
      (pathname.startsWith("/dashboard/") &&
        !pathname.startsWith("/dashboard/orders") &&
        !pathname.startsWith("/dashboard/users") &&
        !pathname.startsWith("/dashboard/whatsapp"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const { t } = useLanguage();
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={[
        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
        active
          ? "bg-ink-800 text-stone-50"
          : "text-ink-600 hover:bg-ink-50 hover:text-ink-800",
      ].join(" ")}
    >
      <Icon name={item.mark} className={`h-5 w-5 ${active ? "text-brass-100" : "text-ink-400"}`} />
      {t(item.labelKey)}
    </Link>
  );
}


function ApartmentNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t, locale } = useLanguage();
  const pathname = usePathname();
  const search = useSearchParams();
  const active = pathname === "/apartments";
  const listingType = search.get("listingType");
  return <details key={active ? "apartments" : "other"} open={active} className="group/apartments">
    <summary className={`flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition [&::-webkit-details-marker]:hidden ${active ? "bg-ink-800 text-stone-50" : "text-ink-600 hover:bg-ink-50"}`}>
      <Icon name="home" className="h-5 w-5" />{t("nav.apartments")}<span aria-hidden="true" className="ms-auto transition-transform group-open/apartments:rotate-180">⌄</span>
    </summary>
    <div className="ms-5 mt-1 space-y-1 border-s border-ink-100 ps-3">
      {[
        { value: "", label: locale === "ar" ? "جميع الشقق" : "All apartments" },
        { value: "sale", label: t("filters.forSale") },
        { value: "rent", label: t("filters.forRent") },
      ].map(item => {
        const selected = active && (item.value ? listingType === item.value : !["sale", "rent"].includes(listingType || ""));
        return <Link key={item.value} href={item.value ? `/apartments?listingType=${item.value}` : "/apartments"} onClick={onNavigate} aria-current={selected ? "page" : undefined} className={`block rounded-lg px-3 py-2.5 text-sm transition ${selected ? "bg-moss-100 font-semibold text-moss-600" : "text-ink-500 hover:bg-ink-50 hover:text-ink-800"}`}>{item.label}</Link>;
      })}
    </div>
  </details>;
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const role = session?.user.role;
  const adminItems: NavItem[] = [];
  if (role && LISTINGS_ROLES.includes(role)) {
    adminItems.push({ href: "/dashboard", labelKey: "nav.dashboard", mark: "grid" });
  }
  if (role && ORDERS_ROLES.includes(role)) {
    adminItems.push({ href: "/dashboard/orders", labelKey: "nav.orders", mark: "clipboard" });
  }
  if (role === "admin") {
    adminItems.push({ href: "/dashboard/users", labelKey: "nav.users", mark: "users" });
    adminItems.push({ href: "/dashboard/whatsapp", labelKey: "whatsappConnection.title", mark: "phone" });
  }

  return (
    <nav className="flex h-full flex-col gap-8 overflow-y-auto p-5">
      <div>
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-ink-500">
          {t("nav.browseSection")}
        </p>
        <div className="space-y-1">
          {BROWSE_ITEMS.map((item) => (
            item.href === "/apartments" ? <Suspense key={item.href} fallback={<NavLink item={item} pathname={pathname} onNavigate={onNavigate} />}><ApartmentNav onNavigate={onNavigate} /></Suspense> : <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      {status === "authenticated" && adminItems.length > 0 && (
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-ink-500">
            {t("nav.adminSection")}
          </p>
          <div className="space-y-1">
            {adminItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto space-y-3">
        {status === "authenticated" ? (
          <>
            {role && LISTINGS_ROLES.includes(role) && (
              <Link href="/dashboard/new" onClick={onNavigate} className="btn-primary w-full justify-center">
                {t("nav.addListing")}
              </Link>
            )}
            <div className="flex items-center justify-between gap-2 rounded-md border border-ink-100 bg-stone-50 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink-700">{session.user.name}</p>
                <p className="truncate text-[11px] text-ink-400">
                  {role ? t(roleLabelKey(role)) : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex-shrink-0 text-xs font-semibold text-rust-500 hover:underline"
              >
                {t("auth.signOut")}
              </button>
            </div>
          </>
        ) : (
          <Link
            href="/login"
            onClick={onNavigate}
            className="btn-secondary w-full justify-center"
          >
            {t("auth.staffSignIn")}
          </Link>
        )}
      </div>
    </nav>
  );
}
