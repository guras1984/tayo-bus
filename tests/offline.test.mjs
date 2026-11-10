import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
function worker(network){const handlers={},offline=new Response('인터넷 연결을 확인해주세요');vm.runInNewContext(source,{self:{location:{origin:'https://tayo.example'},addEventListener:(name,fn)=>handlers[name]=fn},fetch:network,caches:{match:async()=>offline},URL,Response});return handlers;}
test('offline mode never intercepts or caches real-time API requests',()=>{const h=worker(()=>{throw Error('unused')});let intercepted=false;h.fetch({request:{url:'https://tayo.example/api/transit/arrivals?id=02004',method:'GET',mode:'cors'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);});
test('failed page navigation displays the offline notice rather than old bus data',async()=>{const h=worker(async()=>{throw Error('offline')});let response;h.fetch({request:{url:'https://tayo.example/',method:'GET',mode:'navigate'},respondWith:value=>response=value});assert.equal(await(await response).text(),'인터넷 연결을 확인해주세요');});
test('online navigation receives the current server response',async()=>{const h=worker(async()=>new Response('current'));let response;h.fetch({request:{url:'https://tayo.example/',method:'GET',mode:'navigate'},respondWith:value=>response=value});assert.equal(await(await response).text(),'current');});
