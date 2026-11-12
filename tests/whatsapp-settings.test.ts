import test from 'node:test';
import assert from 'node:assert/strict';
import {encryptWhatsAppKey,decryptWhatsAppKey,whatsAppKeyReadable,storedWhatsAppState,WhatsAppCredentialsError} from '../lib/whatsapp-settings';
function withSecret(run:()=>void){const original=process.env.NEXTAUTH_SECRET;process.env.NEXTAUTH_SECRET='first-server-secret-for-tests';try{run();}finally{if(original===undefined)delete process.env.NEXTAUTH_SECRET;else process.env.NEXTAUTH_SECRET=original;}}
const saved=(encryptedKey:string)=>({url:'https://office.example',encryptedKey,siteUrl:'https://example.com',replyLocale:'ar' as const});
test('WhatsApp keys round-trip securely without plaintext in the stored payload',()=>withSecret(()=>{
 const key='private-service-api-key',cipher=encryptWhatsAppKey(key);assert.equal(decryptWhatsAppKey(cipher),key);assert.equal(whatsAppKeyReadable(cipher),true);assert.equal(cipher.includes(key),false);assert.notEqual(encryptWhatsAppKey(key),cipher);
}));
test('changed secrets produce a recoverable state and never fall back to another server key',()=>withSecret(()=>{
 const cipher=encryptWhatsAppKey('first-service-key');process.env.NEXTAUTH_SECRET='second-server-secret-for-tests';
 assert.throws(()=>decryptWhatsAppKey(cipher),error=>error instanceof WhatsAppCredentialsError&&!error.message.includes('first-service-key'));
 assert.deepEqual(storedWhatsAppState(saved(cipher),{url:'https://other.example',key:'wrong-fallback-key'}),{config:null,credentialIssue:true});assert.equal(whatsAppKeyReadable(cipher),false);
}));
test('re-entering the service key repairs encryption under the current stable server secret',()=>withSecret(()=>{
 const old=encryptWhatsAppKey('service-key');process.env.NEXTAUTH_SECRET='replacement-server-secret';assert.equal(whatsAppKeyReadable(old),false);
 const repaired=encryptWhatsAppKey('service-key');assert.equal(whatsAppKeyReadable(repaired),true);assert.equal(storedWhatsAppState(saved(repaired),null).config?.key,'service-key');
}));
test('malformed or tampered encrypted settings fail closed without crypto internals',()=>withSecret(()=>{
 const cipher=encryptWhatsAppKey('service-key'),parts=cipher.split('.'),data=Buffer.from(parts[2],'base64');data[0]^=1;parts[2]=data.toString('base64');
 for(const value of [undefined,null,'','bad-data','...','a'.repeat(8193),parts.join('.')]){assert.equal(whatsAppKeyReadable(value),false);assert.throws(()=>decryptWhatsAppKey(value),WhatsAppCredentialsError);}
}));
test('missing server secret is recoverable; environment config is used only without saved settings',()=>withSecret(()=>{
 const cipher=encryptWhatsAppKey('service-key');delete process.env.NEXTAUTH_SECRET;assert.deepEqual(storedWhatsAppState(saved(cipher),null),{config:null,credentialIssue:true});
 const env={url:'http://127.0.0.1:8080',key:'environment-key'};assert.deepEqual(storedWhatsAppState(null,env),{config:env,credentialIssue:false});
}));
