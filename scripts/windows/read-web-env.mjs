// Machine-readable output is captured by the launcher, never echoed to the console.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { siteOrigin } from './configure.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
try{
 const require=createRequire(path.join(root,'package.json'));
 const {combinedEnv:env}=require('@next/env').loadEnvConfig(root,false,{info(){},error(){}});
 if(!env.MONGODB_URI||!/^mongodb(?:\+srv)?:\/\//.test(env.MONGODB_URI)||!env.NEXTAUTH_SECRET||!env.SITE_URL||!env.NEXTAUTH_URL||siteOrigin(env.SITE_URL)!==siteOrigin(env.NEXTAUTH_URL))throw new Error();
 process.stdout.write(JSON.stringify({key:env.OPENWA_API_KEY||'',url:env.OPENWA_API_URL||''}));
}catch{process.exitCode=1;}
