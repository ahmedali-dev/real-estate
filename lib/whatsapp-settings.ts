import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { openwaConfig } from "@/lib/openwa";

function secret() {
  if (!process.env.NEXTAUTH_SECRET) throw new Error("NEXTAUTH_SECRET is required to store integration credentials.");
  return createHash("sha256").update(process.env.NEXTAUTH_SECRET).digest();
}
export function encryptWhatsAppKey(value: string) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", secret(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(part => part.toString("base64")).join(".");
}
export class WhatsAppCredentialsError extends Error {
  constructor(){super("Saved WhatsApp credentials cannot be decrypted. Re-enter the service API key in WhatsApp settings.");this.name="WhatsAppCredentialsError";}
}
export function decryptWhatsAppKey(value:unknown){
  try{
    if(typeof value!=="string"||value.length>8192)throw new Error();
    const parts=value.split(".");if(parts.length!==3||parts.some(part=>!part||!/^[A-Za-z0-9+/]+={0,2}$/.test(part)))throw new Error();
    const [iv,tag,data]=parts.map(part=>Buffer.from(part,"base64"));
    if(iv.length!==12||tag.length!==16||!data.length)throw new Error();
    const cipher=createDecipheriv("aes-256-gcm",secret(),iv);cipher.setAuthTag(tag);
    return Buffer.concat([cipher.update(data),cipher.final()]).toString("utf8");
  }catch{throw new WhatsAppCredentialsError();}
}
export function whatsAppKeyReadable(value:unknown){try{return Boolean(decryptWhatsAppKey(value));}catch{return false;}}
export interface StoredWhatsAppSettings {url:string;encryptedKey:string;siteUrl:string;replyLocale:"ar"|"en"}
export function storedWhatsAppState(saved:StoredWhatsAppSettings|null,fallback:ReturnType<typeof openwaConfig>=openwaConfig()){
  if(!saved)return {config:fallback,credentialIssue:false};
  try{return {config:{url:saved.url,key:decryptWhatsAppKey(saved.encryptedKey),siteUrl:saved.siteUrl,replyLocale:saved.replyLocale},credentialIssue:false};}
  catch{return {config:null,credentialIssue:true};}
}
export async function whatsappSettingsCollection() {
  await connectToDatabase();
  return mongoose.connection.collection<{ _id: string; url: string; encryptedKey: string; siteUrl: string; replyLocale: "ar" | "en"; updatedAt: Date }>("integration_settings");
}
export async function savedWhatsAppSettings() { return (await whatsappSettingsCollection()).findOne({ _id: "whatsapp" }); }
export async function whatsAppConfigurationState(){return storedWhatsAppState(await savedWhatsAppSettings());}
export async function resolvedWhatsAppConfig(){return (await whatsAppConfigurationState()).config;}
