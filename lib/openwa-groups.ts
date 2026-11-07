import { openwaRequestHeaders } from "./openwa-http";
export type WhatsAppGroup = { id: string; name: string };
export function parseWhatsAppGroups(value: unknown): WhatsAppGroup[] {
  if (!Array.isArray(value)) throw new Error("Invalid group list");
  const groups = new Map<string, WhatsAppGroup>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const id = typeof item.id === "string" ? item.id : item.id?._serialized;
    if (typeof id !== "string" || !/^\d+(?:-\d+)?@g\.us$/.test(id)) continue;
    const name = typeof item.name === "string" ? item.name : typeof item.formattedTitle === "string" ? item.formattedTitle : id;
    groups.set(id, { id, name });
  }
  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
}
// OpenWA 5.1 implements chat listing but not getAllGroups. Filter group IDs
// server-side so individual chats are never exposed to the group picker.
export async function fetchWhatsAppGroups(config: { url: string; key: string }, fetcher = fetch) {
  const response = await fetcher(`${config.url}/api/chats/getAll`, { cache: "no-store", redirect: "error", headers: openwaRequestHeaders(config.key), signal: AbortSignal.timeout(10000) });
  const result = await response.json();
  if (!response.ok || result.success === false || result.error) throw new Error("Could not load groups");
  return parseWhatsAppGroups(result.data);
}
