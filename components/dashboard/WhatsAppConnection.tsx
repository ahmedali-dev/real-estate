"use client";

import { WhatsAppSettings } from "./WhatsAppSettings";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type Connection = { status: "loading" | "setup" | "offline" | "waiting" | "pairing" | "connected" | "licenseInvalid" | "blocked" | "gatewayMissing" | "authError" | "tunnelPage"; qr: string | null };
export function WhatsAppConnection() {
  const { t } = useLanguage();
  const [connection, setConnection] = useState<Connection>({ status: "loading", qr: null });
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      let next: Connection = { status: "offline", qr: null };
      try {
        const response = await fetch("/api/whatsapp/connection", { cache: "no-store", signal: controller.signal });
        if (response.ok) next = await response.json();
        else if (response.status === 401 || response.status === 403) { setConnection(next); return; }
      } catch { if (controller.signal.aborted) return; }
      if (controller.signal.aborted) return;
      setConnection(next);
      timer = setTimeout(poll, next.status === "pairing" || next.status === "waiting" ? 5000 : 15000);
    }
    poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [refresh]);

  return <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
    <h1 className="font-display text-3xl font-semibold text-ink-800">{t("whatsappConnection.title")}</h1>
    <p className="mt-2 text-ink-500">{t("whatsappConnection.description")}</p>
    <WhatsAppSettings onSaved={() => setRefresh(value => value + 1)} />
    <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
      <p role="status" className="font-semibold text-ink-800">{t(`whatsappConnection.${connection.status}`)}</p>
      {connection.status === "pairing" && connection.qr && <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={connection.qr} alt={t("whatsappConnection.qrAlt")} width={320} height={320} className="mx-auto mt-4 h-auto max-w-full rounded-xl bg-white" />
        <p className="mt-4 text-center text-sm text-ink-600">{t("whatsappConnection.scan")}</p>
      </>}
      {connection.status==="gatewayMissing"&&<div className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-ink-600"><p>{t("whatsappConnection.gatewayHelp")}</p><code dir="ltr" className="mt-2 block select-all">ngrok http http://127.0.0.1:8080</code></div>}
      {connection.status === "licenseInvalid" && <p className="mt-4 text-sm text-ink-600">{t("whatsappConnection.fixLicense")}</p>}
      {(connection.status === "offline" || connection.status === "setup") && <div className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-ink-600">
        <p>{t("whatsappConnection.start")}</p>
        <code dir="ltr" className="mt-2 block select-all">npm run openwa:start</code>
      </div>}
      <button type="button" className="btn-secondary mt-5" onClick={() => setRefresh((value) => value + 1)}>{t("whatsappConnection.refresh")}</button>
    </div>
  </div>;
}
