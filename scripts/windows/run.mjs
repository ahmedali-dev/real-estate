import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { includesWeb,includesWhatsApp,validPort } from './configure.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export function supportedRuntime(version,component){
 const clean=version.replace(/^v/,'');if(!/^\d+\.\d+\.\d+$/.test(clean))return false;
 const [major,minor,patch]=clean.split('.').map(Number);
 if(!Number.isInteger(major)||major<22||major%2!==0)return false;
 return !includesWhatsApp(component)||(major===22&&(minor>22||minor===22&&patch>=2));
}
export function launchPlan(appRoot,component,{webPort=3000,host='127.0.0.1',serviceEnv={}}={}){
 if(!['Web','WhatsApp','Both'].includes(component))throw new Error('Choose Web, WhatsApp, or Both.');
 if(!validPort(webPort)||!['127.0.0.1','0.0.0.0','localhost'].includes(host))throw new Error('Invalid web port or bind address.');
 const plan=[];
 if(includesWeb(component))plan.push({name:'Real Estate',cwd:appRoot,args:[path.join(appRoot,'node_modules/next/dist/bin/next'),'start','--hostname',host,'--port',String(webPort)],ports:[{port:webPort,host}],env:{NODE_ENV:'production'}});
 if(includesWhatsApp(component)){
  const port=Number(serviceEnv.PORT||8080);if(!validPort(port))throw new Error('Set a valid PORT (1024-65534) in services/openwa/.env.');
  if(!serviceEnv.OPENWA_API_KEY||serviceEnv.OPENWA_API_KEY.length<24)throw new Error('Configure OPENWA_API_KEY in services/openwa/.env (at least 24 characters).');
  plan.push({name:'WhatsApp',cwd:path.join(appRoot,'services/openwa'),args:['--env-file-if-exists=.env',path.join(appRoot,'services/openwa/start.mjs')],ports:[{port,host:'127.0.0.1'},{port:port+1,host:'127.0.0.1'}],env:{}});
 }
 const ports=plan.flatMap(p=>p.ports.map(v=>v.port));if(new Set(ports).size!==ports.length)throw new Error('Web and WhatsApp ports conflict. WhatsApp also uses its PORT+1.');
 return plan;
}
export function requireFiles(appRoot,component){
 const files=[];
 if(includesWeb(component))files.push('node_modules/next/dist/bin/next','.next/BUILD_ID');
 if(includesWhatsApp(component))files.push('services/openwa/node_modules/@open-wa/wa-automate/package.json','services/openwa/.env');
 for(const file of files)if(!fs.existsSync(path.join(appRoot,file)))throw new Error(`Missing ${file}. Run .\\init-windows.ps1 for this component first.`);
}
function portAvailable({port,host}){return new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',()=>reject(new Error(`Port ${port} is already in use or unavailable. No existing process was stopped.`)));server.listen({port,host,exclusive:true},()=>server.close(error=>error?reject(error):resolve()));});}
async function main(){
 const component=process.argv[2],args=process.argv.slice(3),check=args.includes('--check');
 if(!['Web','WhatsApp','Both'].includes(component))throw new Error('Choose Web, WhatsApp, or Both.');
 if(!supportedRuntime(process.versions.node,component))throw new Error('Use Node 22.22.2 or newer 22.x for WhatsApp; use a supported Node LTS >=22 for the web app.');
 requireFiles(root,component);
 const settingsFile=path.join(root,'.windows-server.json'),settings=fs.existsSync(settingsFile)?JSON.parse(fs.readFileSync(settingsFile,'utf8')):{};
 const readArg=(key,fallback)=>{const at=args.indexOf(key);return at<0?fallback:args[at+1];};
 const webPort=Number(readArg('--web-port',settings.webPort||3000)),host=readArg('--host','127.0.0.1');
 const serviceFile=path.join(root,'services/openwa/.env');
 const serviceEnv=includesWhatsApp(component)?{...parseEnv(fs.readFileSync(serviceFile,'utf8')),...process.env}:{};
 let webConfig={};
 if(includesWeb(component)){
  // The same .env precedence and expansion as Next.js, in an isolated process.
  const envReader=path.join(root,'scripts/windows/read-web-env.mjs');
  const {spawnSync}=await import('node:child_process');
  const result=spawnSync(process.execPath,[envReader],{cwd:root,encoding:'utf8',env:{...process.env,NODE_ENV:'production'},maxBuffer:1024*1024});
  if(result.status!==0)throw new Error('Missing web configuration. Set MONGODB_URI, NEXTAUTH_SECRET, SITE_URL and NEXTAUTH_URL in .env.local.');
  try{webConfig=JSON.parse(result.stdout);}catch{throw new Error('Unable to read web configuration.');}
 }
 const plan=launchPlan(root,component,{webPort,host,serviceEnv});
 if(component==='Both'&&(webConfig.key!==serviceEnv.OPENWA_API_KEY||webConfig.url?.replace(/\/$/,'')!==`http://127.0.0.1:${Number(serviceEnv.PORT||8080)}`))throw new Error('The app and local WhatsApp configuration do not match. Check OPENWA_API_URL and OPENWA_API_KEY in both environment files or saved dashboard settings.');
 if(check){console.log(`Configuration and dependencies are ready for: ${plan.map(p=>p.name).join(' + ')}. No service was started or port reserved.`);return;}
 for(const item of plan)for(const port of item.ports)await portAvailable(port);
 const children=new Set();let stopping=false;
 const stop=async(code)=>{
  if(stopping)return;stopping=true;process.exitCode=code;
  await Promise.all([...children].map(child=>new Promise(resolve=>{
   if(child.exitCode!==null||!child.pid){resolve();return;}
   child.once('exit',resolve);
   if(process.platform==='win32'){
    const kill=spawn(path.join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'});
    kill.once('error',()=>{child.kill();resolve();});kill.once('exit',resolve);
   }else child.kill('SIGTERM');
  })));
 };
 process.on('SIGINT',()=>void stop(0));process.on('SIGTERM',()=>void stop(0));
 for(const item of plan){
  if(stopping)break;
  console.log(`Starting ${item.name} on local port ${item.ports[0].port}. Press Ctrl+C to stop the services started by this launcher.`);
  const child=spawn(process.execPath,item.args,{cwd:item.cwd,env:{...process.env,...item.env},stdio:'inherit',windowsHide:true});children.add(child);
  child.once('error',()=>{console.error(`${item.name} failed to start.`);void stop(1);});
  child.once('exit',(code,signal)=>{children.delete(child);if(!stopping){console.error(`${item.name} exited (${code??signal??'unknown'}). Stopping the other launcher-owned service, if running.`);void stop(code||1);}});
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error instanceof SyntaxError?'Invalid local configuration JSON.':error.message);process.exitCode=1;});
