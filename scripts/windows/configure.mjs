import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export class WindowsSetupError extends Error {}
export const includesWeb=component=>component==='Web'||component==='Both';
export const includesWhatsApp=component=>component==='WhatsApp'||component==='Both';
export function validPort(value){return Number.isInteger(value)&&value>=1024&&value<=65534;}
export function siteOrigin(value){
 const url=new URL(value),local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if((url.protocol!=='https:'&&!(local&&url.protocol==='http:'))||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw new WindowsSetupError('Use the website HTTPS origin, or HTTP localhost for local use, without a path or credentials.');
 return url.origin;
}
export function envLine(key,value,expand=false){
 const text=String(value);if(/[\r\n\0"]/u.test(text))throw new WindowsSetupError(`Invalid ${key}: use one line without double quotes. Encode special characters in connection URLs.`);
 return `${key}="${expand?text.replaceAll('$','\\$'):text}"`;
}
function readEnv(file){return fs.existsSync(file)?parseEnv(fs.readFileSync(file,'utf8')):{};}
export function appendMissing(file,entries,effective,expand=false){
 const additions=Object.entries(entries).filter(([key,value])=>!effective[key]&&value!==undefined&&value!=='').map(([key,value])=>envLine(key,value,expand));
 if(!additions.length)return;
 fs.appendFileSync(file,'\n# Windows Server setup\n'+additions.join('\n')+'\n',{encoding:'utf8',mode:0o600});
}
export function configure(appRoot,input,webConfig={}){
 const component=input.component;if(!['Web','WhatsApp','Both'].includes(component))throw new WindowsSetupError('Choose Web, WhatsApp, or Both.');
 const web=includesWeb(component),whatsapp=includesWhatsApp(component),settingsFile=path.join(appRoot,'.windows-server.json');
 const saved=fs.existsSync(settingsFile)?JSON.parse(fs.readFileSync(settingsFile,'utf8')):{};
 const webPort=Number(input.webPort||saved.webPort||3000);if(!validPort(webPort))throw new WindowsSetupError('Invalid web port. Use 1024-65534.');
 const serviceFile=path.join(appRoot,'services/openwa/.env'),service=readEnv(serviceFile);
 const suppliedSite=input.siteUrl?siteOrigin(input.siteUrl):'';
 const site=siteOrigin(webConfig.SITE_URL||webConfig.NEXTAUTH_URL||suppliedSite||`http://localhost:${webPort}`);
 if(web&&suppliedSite&&suppliedSite!==site)throw new WindowsSetupError('SITE_URL/NEXTAUTH_URL already use a different website. Edit the existing environment configuration explicitly before changing domains.');
 if(web&&webConfig.SITE_URL&&webConfig.NEXTAUTH_URL&&siteOrigin(webConfig.SITE_URL)!==siteOrigin(webConfig.NEXTAUTH_URL))throw new WindowsSetupError('SITE_URL and NEXTAUTH_URL must match the public website origin.');
 const key=webConfig.OPENWA_API_KEY||service.OPENWA_API_KEY||crypto.randomBytes(32).toString('hex');
 if(whatsapp&&key.length<24)throw new WindowsSetupError('The existing OpenWA API key is too short; configure a matching key of at least 24 characters in the web app and service.');
 if(web&&whatsapp&&service.OPENWA_API_KEY&&service.OPENWA_API_KEY!==key)throw new WindowsSetupError('The saved web and WhatsApp API keys differ. Align them manually; setup did not replace either key.');
 const servicePort=Number(service.PORT||8080);if(whatsapp&&(!validPort(servicePort)||servicePort===webPort||servicePort+1===webPort))throw new WindowsSetupError('WhatsApp PORT and its upstream PORT+1 must not conflict with the web port.');
 if(web&&whatsapp&&webConfig.OPENWA_API_URL&&webConfig.OPENWA_API_URL.replace(/\/$/,'')!==`http://127.0.0.1:${servicePort}`)throw new WindowsSetupError('The website already targets a different WhatsApp server. Select components separately or explicitly update OPENWA_API_URL.');
 if(web&&input.mongodbUri&&webConfig.MONGODB_URI&&input.mongodbUri!==webConfig.MONGODB_URI)throw new WindowsSetupError('MONGODB_URI is already configured. Edit the existing environment file explicitly to change databases.');
 if(web&&input.cloudinaryUrl&&webConfig.CLOUDINARY_URL&&input.cloudinaryUrl!==webConfig.CLOUDINARY_URL)throw new WindowsSetupError('CLOUDINARY_URL is already configured. Edit the existing environment file explicitly to replace it.');
 if(web&&input.authSecret&&webConfig.NEXTAUTH_SECRET&&input.authSecret!==webConfig.NEXTAUTH_SECRET)throw new WindowsSetupError("NEXTAUTH_SECRET already exists. Setup will not rotate it. Restore the original value explicitly if this server must share an existing database.");
 const mongodb=webConfig.MONGODB_URI||input.mongodbUri;
 if(web&&(!mongodb||!/^mongodb(?:\+srv)?:\/\//.test(mongodb)))throw new WindowsSetupError('Provide your MongoDB Atlas/replica-set URI when prompted. No database or demo admin is created automatically.');
 if(web){
  appendMissing(path.join(appRoot,'.env.local'),{MONGODB_URI:mongodb,NEXTAUTH_SECRET:input.authSecret||crypto.randomBytes(32).toString('hex'),SITE_URL:site,NEXTAUTH_URL:site,CLOUDINARY_URL:input.cloudinaryUrl,...(whatsapp?{OPENWA_API_URL:`http://127.0.0.1:${servicePort}`,OPENWA_API_KEY:key}:{})},webConfig,true);
  fs.writeFileSync(settingsFile,JSON.stringify({webPort},null,2)+'\n',{mode:0o600});
 }
 if(whatsapp)appendMissing(serviceFile,{OPENWA_API_KEY:key,PORT:servicePort,WA_USER_DATA_DIR:'./_IGNORE_property-office-user',WHATSAPP_WEBHOOK_URL:(web?`http://127.0.0.1:${webPort}`:site)+'/api/webhooks/whatsapp'},service);
 return {webPort,site,whatsappPort:servicePort};
}
async function main(){
 let data='';for await(const chunk of process.stdin){data+=chunk;if(data.length>65536)throw new WindowsSetupError('Configuration input is too large.');}
 const input=JSON.parse(data);let webConfig={};
 if(includesWeb(input.component)){
  const require=createRequire(path.join(root,'package.json'));const {loadEnvConfig}=require('@next/env');
  process.env.NODE_ENV='production';webConfig=loadEnvConfig(root,false,{info(){},error(){}}).combinedEnv;
 }
 const result=configure(root,input,webConfig);
 console.log('Configuration ready. Existing secrets were preserved; credentials were not printed.');
 if(includesWeb(input.component))console.log(`Website origin: ${result.site}. Local web port: ${result.webPort}.`);
 if(includesWhatsApp(input.component))console.log(`WhatsApp listens locally on port ${result.whatsappPort}; its internal API uses ${result.whatsappPort+1}.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error instanceof WindowsSetupError?error.message:'Windows configuration failed. Check the component prerequisites and existing environment files.');process.exitCode=1;});
