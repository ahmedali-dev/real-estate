"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  mark: string;
}

const BROWSE_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.allListings", mark: "◆" },
  { href: "/apartments", labelKey: "nav.apartments", mark: "A" },
  { href: "/builds", labelKey: "nav.builds", mark: "B" },
  { href: "/lands", labelKey: "nav.lands", mark: "L" },
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
        !pathname.startsWith("/dashboard/users"))
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
      onClick={onNavigate}
      className={[
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-ink-800 text-stone-50"
          : "text-ink-600 hover:bg-ink-50 hover:text-ink-800",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm border text-[10px] leading-none",
          active ? "border-stone-50/40 text-stone-50" : "border-ink-300 text-ink-400",
        ].join(" ")}
      >
        {item.mark}
      </span>
      {t(item.labelKey)}
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const role = session?.user.role;
  const adminItems: NavItem[] = [];
  if (role && LISTINGS_ROLES.includes(role)) {
    adminItems.push({ href: "/dashboard", labelKey: "nav.dashboard", mark: "◇" });
  }
  if (role && ORDERS_ROLES.includes(role)) {
    adminItems.push({ href: "/dashboard/orders", labelKey: "nav.orders", mark: "✓" });
  }
  if (role === "admin") {
    adminItems.push({ href: "/dashboard/users", labelKey: "nav.users", mark: "◈" });
  }

  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <div>
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-ink-300">
          {t("nav.browseSection")}
        </p>
        <div className="space-y-1">
          {BROWSE_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      {status === "authenticated" && adminItems.length > 0 && (
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-ink-300">
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
