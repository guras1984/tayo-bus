import test from 'node:test';
import assert from 'node:assert/strict';
import {readFavorites,readRegion,DEFAULT_REGION} from '../lib/preferences.ts';
test('existing Daejeon favorites are preserved and assigned region 25',()=>{const saved=readFavorites(JSON.stringify([{id:'DJB123',name:'대전역',number:'12460'}]));assert.equal(saved[0].cityCode,'25');assert.equal(saved[0].name,'대전역');});
test('same stop id across regions remains distinct',()=>{const saved=readFavorites(JSON.stringify([{id:'123',name:'첫 정류장',cityCode:'21'},{id:'123',name:'둘째 정류장',cityCode:'22'}]));assert.equal(saved.filter(s=>s.cityCode==='21').length,1);assert.equal(saved.filter(s=>s.cityCode==='22').length,1);});
test('valid persisted region restores; invalid data falls back safely',()=>{assert.deepEqual(readRegion('{"code":"21","name":"부산광역시"}'),{code:'21',name:'부산광역시'});assert.deepEqual(readRegion('bad-json'),DEFAULT_REGION);assert.deepEqual(readFavorites('bad-json'),[]);assert.deepEqual(readFavorites('[{"id":"demo-1","name":"예시"}]'),[]);});
