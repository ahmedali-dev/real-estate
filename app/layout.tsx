import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

export const metadata: Metadata = {
  title: "Maskan | Real Estate Listings",
  description:
    "Browse and manage builds, apartments, and land for sale or rent.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className="font-body antialiased">
        <LanguageProvider>
          <SiteHeader />
          <main className="min-h-[calc(100vh-64px)]">{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}
