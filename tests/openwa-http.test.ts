import test from 'node:test';
import assert from 'node:assert/strict';
import {sendOpenwa} from '../lib/openwa';
import {fetchWhatsAppGroups} from '../lib/openwa-groups';

test('send and group requests include ngrok header without removing API authentication',async()=>{
 const config={url:'https://office.ngrok-free.dev',key:'test-key'},requests:string[]=[];
 const mock:typeof fetch=async(url,options)=>{
  requests.push(String(url));const h=new Headers(options?.headers);
  assert.equal(h.get('ngrok-skip-browser-warning'),'1');assert.equal(h.get('X-API-Key'),config.key);assert.equal(h.get('Accept'),'application/json');assert.equal(options?.redirect,'error');
  if(String(url).endsWith('/office/connection'))return Response.json({connected:true});
  if(String(url).endsWith('/sendText')){assert.equal(h.get('Content-Type'),'application/json');return Response.json({data:'false_966500000000@c.us_test'});}
  return Response.json({data:[]});
 };
 assert.equal(await sendOpenwa(config,'966500000000@c.us','test',mock),'false_966500000000@c.us_test');
 assert.deepEqual(await fetchWhatsAppGroups(config,mock),[]);assert.equal(requests.length,3);
});
