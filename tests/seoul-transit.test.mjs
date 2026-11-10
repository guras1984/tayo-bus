import test from 'node:test';
import assert from 'node:assert/strict';
import {handleTransit} from '../lib/transit.mjs';
import {seoulArrivals} from '../lib/seoul-transit.mjs';
const req=path=>new Request('https://app.example/api/transit/'+path);
const env={TAGO_SERVICE_KEY:'test-seoul-fallback'};
const ok=items=>Response.json({msgHeader:{headerCd:'0'},msgBody:{itemList:items}});
test('Seoul name search uses its service, preserves leading zeros and filters unusable stops',async()=>{
 const r=await handleTransit(req('stops?cityCode=11&q=서울역'),env,async url=>{
  const u=new URL(url); assert.equal(u.hostname,'ws.bus.go.kr'); assert.equal(u.pathname,'/api/rest/stationinfo/getStationByName');assert.equal(u.searchParams.get('stSrch'),'서울역');assert.equal(u.searchParams.get('resultType'),'json');assert.equal(u.searchParams.get('serviceKey'),env.TAGO_SERVICE_KEY);
  return ok([{arsId:'01001',stNm:'서울역',tmX:126.97,tmY:37.55},{arsId:'00000',stNm:'미제공'}]);
 }); const d=await r.json();assert.equal(d.total,1);assert.deepEqual(d.items[0],{id:'01001',name:'서울역',number:'01001',cityCode:'11',lat:37.55,lng:126.97});
});
test('Seoul numbered search normalizes hyphens and deduplicates route rows',async()=>{
 const r=await handleTransit(req('stops?cityCode=11&q=02-003'),env,async url=>{assert.equal(new URL(url).searchParams.get('arsId'),'02003');return ok([{arsId:'02003',stNm:'서울역버스환승센터'},{arsId:'02003',stNm:'서울역버스환승센터'}]);});
 assert.equal((await r.json()).items.length,1);
});
test('Seoul nearby uses WGS84 coordinates and 500m radius',async()=>{
 const r=await handleTransit(req('nearby?cityCode=11&lat=37.55&lng=126.97'),env,async url=>{const u=new URL(url);assert.equal(u.pathname,'/api/rest/stationinfo/getStationByPos');assert.equal(u.searchParams.get('tmX'),'126.97');assert.equal(u.searchParams.get('tmY'),'37.55');assert.equal(u.searchParams.get('radius'),'500');return ok({arsId:1002,stationNm:'정류장',gpsX:126.97,gpsY:37.55});});
 assert.equal((await r.json()).items[0].id,'01002');
});
test('Seoul arrivals use predicted messages, not travel-time fields, and preserve next bus',()=>{
 const rows=seoulArrivals([{busRouteId:'r1',rtNm:'701',arrmsg1:'3분12초후[2번째 전]',arrmsg2:'11분5초후[7번째 전]',traTime1:0,busType1:'1',adirection:'서울역'}]);
 assert.deepEqual(rows.map(r=>[r.seconds,r.stops]),[[192,2],[665,7]]);assert.equal(rows[0].vehicle,'저상버스');assert.equal(rows[0].direction,'서울역');
});
test('finished, waiting, absent and imminent statuses never become false arrival estimates',()=>{
 const rows=seoulArrivals(['운행종료','출발대기','','곧 도착'].map((message,index)=>({busRouteId:'r'+index,rtNm:String(index),arrmsg1:message,traTime1:0})));
 assert.equal(rows.find(r=>r.number==='3').seconds,0);
 for(const n of ['0','1','2'])assert.equal(rows.find(r=>r.number===n).seconds,null);
 assert.equal(rows.find(r=>r.number==='0').message,'운행종료');
});
test('Seoul API approval errors are safe and no-results are empty',async()=>{
 let r=await handleTransit(req('arrivals?cityCode=11&id=01003'),env,async()=>Response.json({msgHeader:{headerCd:'7',headerMsg:'secret-provider-diagnostics'}}));assert.equal(r.status,502);assert.ok(!(await r.text()).includes('secret-provider-diagnostics'));
 r=await handleTransit(req('arrivals?cityCode=11&id=01004'),env,async()=>Response.json({msgHeader:{headerCd:'4'}}));assert.deepEqual((await r.json()).items,[]);
});
test('invalid Seoul stop IDs and coordinates are rejected without a provider call',async()=>{
 for(const path of ['arrivals?cityCode=11&id=../../x','arrivals?cityCode=11&id=00000','nearby?cityCode=11&lat=&lng='])assert.equal((await handleTransit(req(path),env,()=>{throw Error('unexpected')})).status,400);
});
