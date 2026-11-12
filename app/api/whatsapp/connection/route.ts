import { openwaRequestHeaders } from "@/lib/openwa-http";
import { whatsAppConfigurationState } from "@/lib/whatsapp-settings";
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireAdmin } from "@/lib/auth/requireSession";
import { openwaPairingStatus, probeOpenwaConnection } from "@/lib/openwa-status";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private", "Vary": "Cookie" };

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  try {
    const {config,credentialIssue}=await whatsAppConfigurationState();
    if(credentialIssue)return NextResponse.json({status:"credentialsInvalid",qr:null},{headers});
    if(!config)return NextResponse.json({status:"setup",qr:null},{headers});
    const probe=await probeOpenwaConnection(config);
    if(probe.issue)return NextResponse.json({status:probe.issue,qr:null},{headers});
    // Access this endpoint over a private network or an authenticated gateway.
    const result = await fetch(`${config.url}/health`, {
      cache: "no-store", redirect: "error", headers: openwaRequestHeaders(config.key), signal: AbortSignal.timeout(4000),
    });
    if(result.status===401||result.status===403)return NextResponse.json({status:"authError",qr:null},{headers});
    if(result.headers.get("content-type")?.includes("text/html"))return NextResponse.json({status:"tunnelPage",qr:null},{headers});
    if (!result.ok) throw new Error("Service unavailable");
    const health = await result.json();
    const connected = probe.connected;
    // A stale /health snapshot must not hide a current pairing QR.
    const pairing = openwaPairingStatus({ ...health, qr: probe.qr || health.qr, connected, session: { ...health.session, ready: connected } });
    const { qr, issue } = pairing;
    const image = qr ? await QRCode.toDataURL(qr, { width: 320, margin: 4, errorCorrectionLevel: "M" }) : null;
    return NextResponse.json({ status: connected ? "connected" : issue || (image ? "pairing" : "waiting"), qr: image }, { headers });
  } catch {
    return NextResponse.json({ status: "offline", qr: null }, { headers });
  }
}
