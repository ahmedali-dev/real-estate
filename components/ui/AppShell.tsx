"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "./Sidebar";
import { SiteHeader } from "./SiteHeader";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer automatically whenever navigation happens.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-e border-ink-100 bg-white md:block">
        <div className="sticky top-0 h-screen">
          <SidebarNav />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-ink-900/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-white shadow-xl">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <SiteHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="min-h-[calc(100vh-64px)] flex-1">{children}</main>
      </div>
    </div>
  );
}
