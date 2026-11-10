import test from 'node:test';
import assert from 'node:assert/strict';
import { handleTransit } from '../lib/transit.mjs';
const req = path => new Request('https://app.example/api/transit/'+path);
const env = {TAGO_SERVICE_KEY:'test-key-only'};
const ok = items => Response.json({response:{header:{resultCode:'00'},body:{items:{item:items},totalCount:Array.isArray(items)?items.length:1}}});
test('missing key is explicit and does not contact provider',async()=>{const r=await handleTransit(req('arrivals?id=DJB1'),{},()=>{throw Error('unexpected call')});assert.equal(r.status,503);});
test('selected region is sent to both search and arrivals; non-Daejeon ids work',async()=>{for(const [city,id] of [['21','BSB123'],['31010','234001']]){
 const stops=await handleTransit(req(`stops?cityCode=${city}&q=중앙역`),env,async url=>{const u=new URL(url);assert.equal(u.searchParams.get('cityCode'),city);return ok({nodeid:id,nodenm:'중앙역',nodeno:123,gpslati:35.1,gpslong:129.1});});const d=await stops.json();assert.equal(d.items[0].id,id);assert.equal(d.items[0].cityCode,city);
 const arrival=await handleTransit(req(`arrivals?cityCode=${city}&id=${id}`),env,async url=>{const u=new URL(url);assert.equal(u.searchParams.get('cityCode'),city);assert.equal(u.searchParams.get('nodeId'),id);return ok({routeid:'r1',routeno:101,arrtime:180,arrprevstationcnt:2});});assert.equal((await arrival.json()).items[0].seconds,180);
}});
test('region list combines TAGO cities with the separate Seoul service',async()=>{const r=await handleTransit(req('regions'),env,async url=>ok(url.includes('BusSttn')?[{citycode:25,cityname:'대전광역시'},{citycode:21,cityname:'부산광역시'},{citycode:11,cityname:'미지원'}]:[{citycode:25,cityname:'대전광역시'},{citycode:21,cityname:'부산광역시'}]));assert.deepEqual((await r.json()).items.map(x=>x.code).sort(),['11','21','25']);});
test('nearby filters by selected city rather than a Daejeon id prefix',async()=>{const r=await handleTransit(req('nearby?cityCode=21&lat=35.1&lng=129.1'),env,async()=>ok([{citycode:21,nodeid:'BSB1',nodenm:'부산'},{citycode:25,nodeid:'DJB1',nodenm:'대전'}]));const d=await r.json();assert.equal(d.items.length,1);assert.equal(d.items[0].id,'BSB1');});
test('empty response remains empty; upstream rejection remains an error',async()=>{let r=await handleTransit(req('arrivals?id=DJB5678'),env,async()=>ok(''));assert.deepEqual((await r.json()).items,[]);r=await handleTransit(req('arrivals?id=DJB9'),env,async()=>Response.json({response:{header:{resultCode:'30'}}}));assert.equal(r.status,502);});
test('invalid city ids and coordinates are rejected',async()=>{for(const path of ['stops?cityCode=https://bad&q=x','arrivals?id=../../foo','nearby?lat=&lng=','nearby?lat=70&lng=129'])assert.equal((await handleTransit(req(path),env)).status,400);});
test('cache never mixes cities with the same stop id',async()=>{for(const city of ['22','23']){const r=await handleTransit(req(`arrivals?cityCode=${city}&id=same-stop`),env,async()=>ok({routeid:'r',routeno:city,arrtime:60}));assert.equal((await r.json()).items[0].number,city);}});
