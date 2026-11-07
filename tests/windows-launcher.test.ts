import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {configure,envLine,siteOrigin} from '../scripts/windows/configure.mjs';
import {supportedRuntime,launchPlan,requireFiles} from '../scripts/windows/run.mjs';
function fixture(run:(root:string)=>void){const root=fs.mkdtempSync(path.join(os.tmpdir(),"estate windows 'fixture "));fs.mkdirSync(path.join(root,'services/openwa'),{recursive:true});try{run(root);}finally{fs.rmSync(root,{recursive:true,force:true});}}
const mongo='mongodb://user:encoded%24password@db.example/estate?replicaSet=rs0';
test('Windows launcher checks the separate web and pinned WhatsApp runtimes',()=>{
 assert.equal(supportedRuntime('22.22.2','Both'),true);assert.equal(supportedRuntime('22.30.0','WhatsApp'),true);assert.equal(supportedRuntime('24.0.0','Web'),true);
 for(const version of ['22.22.1','22.1.0','24.0.0','25.0.0','20.20.2'])assert.equal(supportedRuntime(version,'WhatsApp'),false);
 assert.equal(supportedRuntime('25.0.0','Web'),false);
});
test('web-only setup generates private configuration without installing/configuring WhatsApp',()=>fixture(root=>{
 const result=configure(root,{component:'Web',webPort:3001,mongodbUri:mongo,siteUrl:'https://example.com'},{});
 const env=parseEnv(fs.readFileSync(path.join(root,'.env.local'),'utf8'));assert.equal(env.MONGODB_URI,mongo);assert.match(env.NEXTAUTH_SECRET!,/^[a-f0-9]{64}$/);assert.equal(env.SITE_URL,'https://example.com');assert.equal(result.webPort,3001);assert.equal(env.OPENWA_API_KEY,undefined);assert.equal(fs.existsSync(path.join(root,'services/openwa/.env')),false);
}));
test('WhatsApp-only setup does not need web packages or MongoDB and preserves service secrets on rerun',()=>fixture(root=>{
 configure(root,{component:'WhatsApp',siteUrl:'https://example.com'},{});
 const file=path.join(root,'services/openwa/.env'),original=fs.readFileSync(file,'utf8'),env=parseEnv(original);
 assert.match(env.OPENWA_API_KEY!,/^[a-f0-9]{64}$/);assert.equal(env.WHATSAPP_WEBHOOK_URL,'https://example.com/api/webhooks/whatsapp');assert.equal(fs.existsSync(path.join(root,'.env.local')),false);
 configure(root,{component:'WhatsApp',siteUrl:'https://example.com'},{});assert.equal(fs.readFileSync(file,'utf8'),original);
}));
test('both components share a key without rotating existing authentication/service secrets',()=>fixture(root=>{
 const key='a'.repeat(64);fs.writeFileSync(path.join(root,'services/openwa/.env'),`OPENWA_API_KEY=${key}\nPORT=8090\n`);
 configure(root,{component:'Both',mongodbUri:mongo,siteUrl:'https://example.com'},{NEXTAUTH_SECRET:'keep-existing-auth-secret'});
 const webFile=path.join(root,'.env.local'),web=parseEnv(fs.readFileSync(webFile,'utf8'));
 assert.equal(parseEnv(fs.readFileSync(path.join(root,'services/openwa/.env'),'utf8')).WHATSAPP_WEBHOOK_URL,'http://127.0.0.1:3000/api/webhooks/whatsapp');
 assert.equal(web.OPENWA_API_KEY,key);assert.equal(web.OPENWA_API_URL,'http://127.0.0.1:8090');assert.equal(web.NEXTAUTH_SECRET,undefined); // supplied from an existing env source, never re-written
 const original=fs.readFileSync(webFile,'utf8');configure(root,{component:'Both'}, {...web,NEXTAUTH_SECRET:'keep-existing-auth-secret'});assert.equal(fs.readFileSync(webFile,'utf8'),original);
}));
test('mismatched keys, changed domains and missing database values fail without rewriting config',()=>fixture(root=>{
 fs.writeFileSync(path.join(root,'services/openwa/.env'),'OPENWA_API_KEY='+ 'a'.repeat(64)+'\n');
 assert.throws(()=>configure(root,{component:'Both',mongodbUri:mongo},{OPENWA_API_KEY:'b'.repeat(64)}),/keys differ/);
 assert.equal(fs.existsSync(path.join(root,'.env.local')),false);
 assert.throws(()=>configure(root,{component:'Web'},{}),/MongoDB/);
 assert.throws(()=>configure(root,{component:'Web',siteUrl:'https://other.example'},{SITE_URL:'https://example.com',MONGODB_URI:mongo}),/different website/);
}));
test('selected launch plan uses direct argument arrays, local ports, and no secrets in command arguments',()=>fixture(root=>{
 const key='k'.repeat(32),plan=launchPlan(root,'Both',{webPort:3000,serviceEnv:{PORT:'8080',OPENWA_API_KEY:key}});
 assert.equal(plan.length,2);assert.equal(plan[0].cwd,root);assert.ok(plan[0].args[0].includes("'fixture"));assert.equal(plan[1].cwd,path.join(root,'services/openwa'));assert.ok(plan[1].args.includes('--env-file-if-exists=.env'));assert.equal(JSON.stringify(plan).includes(key),false);
 assert.deepEqual(plan.flatMap((item:{ports:{port:number}[]})=>item.ports.map(p=>p.port)),[3000,8080,8081]);
 assert.equal(launchPlan(root,'Web').length,1);assert.equal(launchPlan(root,'WhatsApp',{serviceEnv:{OPENWA_API_KEY:key}}).length,1);
 assert.throws(()=>launchPlan(root,'Both',{webPort:8081,serviceEnv:{OPENWA_API_KEY:key}}),/conflict/);
}));
test('dependency preflight checks only the requested component',()=>fixture(root=>{
 const pkg=path.join(root,'services/openwa/node_modules/@open-wa/wa-automate/package.json');fs.mkdirSync(path.dirname(pkg),{recursive:true});fs.writeFileSync(pkg,'{}');fs.writeFileSync(path.join(root,'services/openwa/.env'),'OPENWA_API_KEY='+ 'a'.repeat(32));
 assert.doesNotThrow(()=>requireFiles(root,'WhatsApp'));assert.throws(()=>requireFiles(root,'Web'),/Missing/);
}));
test('environment generation protects line boundaries and Next.js dollar expansion',()=>{
 assert.equal(envLine('MONGODB_URI','mongodb://name:cash$amount@host/db',true),'MONGODB_URI="mongodb://name:cash\\$amount@host/db"');
 assert.throws(()=>envLine('SECRET','secret\nINJECTED=true'),/Invalid SECRET/);assert.throws(()=>envLine('SECRET','with"quote'),/Invalid SECRET/);
});
test('website origins require HTTPS except loopback, and reject URL credentials or paths',()=>{
 assert.equal(siteOrigin('https://example.com/'),'https://example.com');assert.equal(siteOrigin('http://localhost:3000'),'http://localhost:3000');
 for(const value of ['http://example.com','https://user:password@example.com','https://example.com/path','https://example.com/?secret=x'])assert.throws(()=>siteOrigin(value));
});
