import { openwaRequestHeaders } from "@/lib/openwa-http";
import { whatsAppConfigurationState } from "@/lib/whatsapp-settings";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireSession";
import { openwaHealthIssue, probeOpenwaConnection } from "@/lib/openwa-status";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private", "Vary": "Cookie" };

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  try {
    const {config,credentialIssue}=await whatsAppConfigurationState();
    if(credentialIssue)return NextResponse.json({status:"credentialsInvalid"},{headers});
    if(!config)return NextResponse.json({status:"setup"},{headers});
    const probe=await probeOpenwaConnection(config);
    if(probe.issue)return NextResponse.json({status:probe.issue},{headers});
    // Access this endpoint over a private network or an authenticated gateway.
    const result = await fetch(`${config.url}/health`, {
      cache: "no-store", redirect: "error", headers: openwaRequestHeaders(config.key), signal: AbortSignal.timeout(4000),
    });
    if(result.status===401||result.status===403)return NextResponse.json({status:"authError"},{headers});
    if(result.headers.get("content-type")?.includes("text/html"))return NextResponse.json({status:"tunnelPage"},{headers});
    if (!result.ok) throw new Error("Service unavailable");
    const health = await result.json();
    const connected = probe.connected;
    // Use the live gateway state for readiness; health is only used for safe startup diagnostics.
    const issue = connected ? null : openwaHealthIssue(health);
    return NextResponse.json({ status: connected ? "connected" : issue || "waiting" }, { headers });
  } catch {
    return NextResponse.json({ status: "offline" }, { headers });
  }
}
