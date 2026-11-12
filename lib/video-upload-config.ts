import { z } from "zod";
export const VIDEO_MODES = ["local", "online"] as const;
export type VideoMode = typeof VIDEO_MODES[number];
export function videoServerUrl(value: string, mode: VideoMode) {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return false;
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    const parts = url.hostname.split(".");
    const ipv4 = parts.length === 4 && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255);
    const [a, b] = parts.map(Number);
    const privateLan = ipv4 && (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168));
    return mode === "local" ? (loopback || privateLan) && ["http:", "https:"].includes(url.protocol) : url.protocol === "https:" && !loopback;
  } catch { return false; }
}
const profile = (mode: VideoMode) => z.object({
  url: z.string().trim().max(2048).refine(value => value === "" || videoServerUrl(value, mode), mode === "local" ? "Local server must use localhost or a private LAN IP (10.x.x.x, 172.16–31.x.x, or 192.168.x.x)." : "Online server must use HTTPS and cannot be localhost."),
  apiKey: z.string().trim().max(1024).default(""),
  clearKey: z.boolean().default(false),
});
export const videoSettingsSchema = z.object({ enabled: z.boolean(), mode: z.enum(VIDEO_MODES), local: profile("local"), online: profile("online") }).superRefine((data, ctx) => {
  if (data.enabled && !data[data.mode].url) ctx.addIssue({ code: "custom", path: [data.mode, "url"], message: "Enter the selected video server URL." });
  for (const mode of VIDEO_MODES) if (data[mode].clearKey && data[mode].apiKey) ctx.addIssue({ code: "custom", path: [mode, "apiKey"], message: "Enter a key or select no API key, not both." });
});
