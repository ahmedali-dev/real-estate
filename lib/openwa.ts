import { openwaRequestHeaders } from "./openwa-http";
import { openwaAccountAvailable } from "./openwa-status";
import type { PropertyDTO } from "@/types/property";
import { propertyTextMessage } from "./property-message";
export { propertyTextMessage } from "./property-message";

export function openwaConfig() {
  try {
    const url = new URL(process.env.OPENWA_API_URL || "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) || url.username || url.password || url.search || url.hash || !process.env.OPENWA_API_KEY) return null;
    return { url: url.href.replace(/\/$/, ""), key: process.env.OPENWA_API_KEY };
  } catch { return null; }
}

export class OpenwaSendError extends Error {
  constructor(public code: "openwaLicense" | "openwaAuth" | "openwaNotReady" | "openwaPartial" | "openwaImage") { super(code); }
}

/** No retries: a timeout may occur after WhatsApp has already accepted the message. */
export async function sendOpenwa(config: NonNullable<ReturnType<typeof openwaConfig>>, to: string, content: string, fetcher = fetch) {
  if (!await openwaAccountAvailable(config, fetcher)) throw new OpenwaSendError("openwaNotReady");
  return sendRequest(config, "sendText", { to, content }, fetcher);
}

async function sendRequest(config: NonNullable<ReturnType<typeof openwaConfig>>, method: string, payload: Record<string, unknown>, fetcher = fetch) {
  const response = await fetcher(`${config.url}/api/messages/${method}`, {
    method: "POST", headers: openwaRequestHeaders(config.key,{"Content-Type":"application/json"}),
    body: JSON.stringify(payload), redirect: "error", signal: AbortSignal.timeout(20000),
  });
  const result: unknown = await response.json();
  const data = result && typeof result === "object" ? result as Record<string, unknown> : {};
  if (!response.ok || data.success === false || data.error) {
    const reason = JSON.stringify({ error: data.error, details: data.details });
    if (/license|licensed|insiders|premium/i.test(reason)) throw new OpenwaSendError("openwaLicense");
    if (response.status === 401) throw new OpenwaSendError("openwaAuth");
    if (response.status === 503) throw new OpenwaSendError("openwaNotReady");
    throw new Error("OpenWA rejected the message.");
  }
  const returned = typeof result === "string" ? result : data.data;
  const messageId = returned && typeof returned === "object" ? (returned as Record<string, unknown>)._serialized : returned;
  if (data.success === false || data.error || typeof messageId !== "string" || !/^(true|false)_[^_]+_.+/.test(messageId)) throw new Error("OpenWA did not confirm the send operation.");
  return messageId;
}


export async function sendPropertyOpenwa(config: NonNullable<ReturnType<typeof openwaConfig>>, to: string, property: PropertyDTO, origin: string, locale: "en" | "ar", fetcher = fetch) {
  return sendOpenwa(config, to, propertyTextMessage(property, origin, locale), fetcher);
}
