import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { encryptWhatsAppKey, decryptWhatsAppKey } from "@/lib/whatsapp-settings";
import { localVideoEnabled, videoConfig } from "@/lib/local-video";
import { videoServerUrl, type VideoMode } from "@/lib/video-upload-config";

type Profile = { url: string; encryptedKey: string };
export type VideoSettings = { enabled: boolean; mode: VideoMode; local: Profile; online: Profile };
export async function videoSettingsCollection() {
  await connectToDatabase();
  return mongoose.connection.collection<VideoSettings & { _id: string; updatedAt: Date }>("integration_settings");
}
export async function savedVideoSettings() { return (await videoSettingsCollection()).findOne({ _id: "video-upload" }); }
export function defaultVideoSettings(): VideoSettings {
  return { enabled: true, mode: "local", local: { url: process.env.VIDEO_UPLOAD_API_URL || "http://127.0.0.1:8000", encryptedKey: "" }, online: { url: "", encryptedKey: "" } };
}
export function decodeVideoKey(profile: Profile) { return profile.encryptedKey ? decryptWhatsAppKey(profile.encryptedKey) : ""; }
export const encryptVideoKey = encryptWhatsAppKey;
export function readableVideoKey(profile: Profile) { try { decodeVideoKey(profile); return true; } catch { return false; } }
export function resolveVideoSettings(saved: VideoSettings | null, requestUrl: string) {
  const settings = saved || defaultVideoSettings();
  if (!settings.enabled || (settings.mode === "local" && !localVideoEnabled(requestUrl))) return null;
  const profile = settings[settings.mode];
  if (!videoServerUrl(profile.url, settings.mode)) throw Error("Invalid video server configuration.");
  return { url: profile.url.replace(/\/$/, ""), key: saved ? decodeVideoKey(profile) : videoConfig().key, mode: settings.mode };
}

export async function resolvedVideoUploadConfig(requestUrl: string) { return resolveVideoSettings(await savedVideoSettings(), requestUrl); }
