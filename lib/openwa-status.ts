import { openwaRequestHeaders } from "./openwa-http";
/** Only expose pairing data needed by the admin page, never raw diagnostics. */
export function openwaPairingStatus(value: unknown) {
  const health = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const session = health.session && typeof health.session === "object" ? health.session as Record<string, unknown> : {};
  const connected = health.connected === true && session.ready === true;
  const license = health.license && typeof health.license === "object" ? health.license as Record<string, unknown> : {};
  const issue = !connected && license.status === "invalid" ? "licenseInvalid" :
    !connected && session.status === "blocked" ? "blocked" : null;
  const qr = !connected && typeof health.qr === "string" && health.qr.length <= 8192 ? health.qr : null;
  return { connected, qr: issue ? null : qr, issue };
}

export type OpenwaConnectionIssue="gatewayMissing"|"authError"|"tunnelPage"|"offline";
/** Probe the authenticated gateway; /health liveness can survive a WhatsApp logout. */
export async function probeOpenwaConnection(config:{url:string;key:string},fetcher=fetch):Promise<{connected:boolean;issue:OpenwaConnectionIssue|null}>{
  try{
    const response=await fetcher(`${config.url}/office/connection`,{cache:"no-store",redirect:"error",headers:openwaRequestHeaders(config.key),signal:AbortSignal.timeout(4000)});
    if(response.status===404)return {connected:false,issue:"gatewayMissing"};
    if(response.status===401||response.status===403)return {connected:false,issue:"authError"};
    if(response.headers.get("content-type")?.includes("text/html"))return {connected:false,issue:"tunnelPage"};
    if(!response.ok)return {connected:false,issue:"offline"};
    const result:unknown=await response.json();
    return {connected:Boolean(result&&typeof result==="object"&&(result as Record<string,unknown>).connected===true),issue:null};
  }catch{return {connected:false,issue:"offline"};}
}
export async function openwaAccountAvailable(config:{url:string;key:string},fetcher=fetch){return (await probeOpenwaConnection(config,fetcher)).connected;}
