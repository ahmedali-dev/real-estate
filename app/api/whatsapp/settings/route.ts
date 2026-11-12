import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireSession";
import { encryptWhatsAppKey, whatsAppKeyReadable, savedWhatsAppSettings, whatsappSettingsCollection } from "@/lib/whatsapp-settings";
import { publicSiteOrigin, configuredPublicSiteOrigin } from "@/lib/site-url";
const headers = { "Cache-Control": "no-store, private" };
const schema = z.object({
  url: z.string().trim().url().refine(value => { const u = new URL(value); return !u.username && !u.password && !u.search && !u.hash && (u.protocol === "https:" || (u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname))); }, "Use HTTPS, or HTTP for localhost only."),
  apiKey: z.string().trim().max(1024).optional(),
  siteUrl: z.string().trim().refine(value => Boolean(publicSiteOrigin(value)), "Enter a public website URL."),
  replyLocale: z.enum(["ar", "en"]),
});
export async function GET() {
  const { response } = await requireAdmin(); if (response) return response;
  try {
    const saved = await savedWhatsAppSettings();
    const requiresKey=Boolean(saved&&!whatsAppKeyReadable(saved.encryptedKey));
    return NextResponse.json({ requiresKey,url: saved?.url || process.env.OPENWA_API_URL || "", hasKey: saved?!requiresKey:Boolean(process.env.OPENWA_API_KEY), siteUrl: saved?.siteUrl || configuredPublicSiteOrigin() || "", replyLocale: saved?.replyLocale || (process.env.WHATSAPP_REPLY_LOCALE === "en" ? "en" : "ar"), source: saved ? "database" : "environment" }, { headers });
  } catch { return NextResponse.json({ error: "Could not load settings." }, { status: 500, headers }); }
}
export async function PUT(req: NextRequest) {
  const { response } = await requireAdmin(); if (response) return response;
  if (req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map(issue => issue.message).join(" ") }, { status: 400 });
    const old = await savedWhatsAppSettings();
    const key = parsed.data.apiKey || (!old ? process.env.OPENWA_API_KEY : "");
    if(!key&&old&&!whatsAppKeyReadable(old.encryptedKey))return NextResponse.json({code:"credentialsInvalid",error:"The saved API key cannot be decrypted with this server secret. Re-enter the WhatsApp service API key and save again."},{status:409,headers});
    if (!key && !old?.encryptedKey) return NextResponse.json({ error: "API key is required." }, { status: 400 });
    await (await whatsappSettingsCollection()).updateOne({ _id: "whatsapp" }, { $set: { url: parsed.data.url.replace(/\/$/, ""), encryptedKey: key ? encryptWhatsAppKey(key) : old!.encryptedKey, siteUrl: publicSiteOrigin(parsed.data.siteUrl)!, replyLocale: parsed.data.replyLocale, updatedAt: new Date() } }, { upsert: true });
    return NextResponse.json({ success: true }, { headers });
  } catch { return NextResponse.json({ error: "Could not save settings. Check database and server secret configuration." }, { status: 500 }); }
}
