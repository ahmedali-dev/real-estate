"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { UserRole } from "@/types/user";
import Image from "next/image";
import logo from "./logo.png";
const LISTINGS_ROLES: UserRole[] = ["admin", "real_estate_officer", "project_manager"];

export function SiteHeader({ onMenuClick }: { onMenuClick?: () => void }) {
	const { t, locale, setLocale } = useLanguage();
	const { data: session } = useSession();
	const canAddListing = Boolean(session?.user.role && LISTINGS_ROLES.includes(session.user.role));

	return (
		<header className="sticky top-0 z-30 border-b border-ink-100 bg-stone-50/90 backdrop-blur">
			<div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onMenuClick}
						className="flex h-9 w-9 items-center justify-center rounded-md border border-ink-200 text-ink-600 transition hover:bg-ink-50 md:hidden"
						aria-label={t("nav.openMenu")}
					>
						<span className="sr-only">{t("nav.openMenu")}</span>
						<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
							<path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
						</svg>
					</button>
					<Link href="/" className="flex items-center gap-2.5">
						<span className="flex h-[65px] w-[65px] items-center justify-center font-display text-sm font-semibold text-ink-800">
							<Image src={logo} alt="logo" />
						</span>
						<span className="font-display text-xl font-semibold tracking-tight text-ink-800">{t("nav.brand")}</span>
					</Link>
				</div>

				<div className="flex items-center gap-2">
					{canAddListing && (
						<Link href="/dashboard/new" className="hidden rounded-md bg-ink-800 px-3.5 py-2 text-sm font-medium text-stone-50 transition hover:bg-ink-700 sm:inline-flex">
							{t("nav.addListing")}
						</Link>
					)}
					<button
						type="button"
						onClick={() => setLocale(locale === "en" ? "ar" : "en")}
						className="rounded-md border border-ink-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-600 transition hover:border-ink-400 hover:bg-stone-50"
						aria-label="Toggle language"
					>
						{locale === "en" ? "العربية" : "English"}
					</button>
				</div>
			</div>
		</header>
	);
}
