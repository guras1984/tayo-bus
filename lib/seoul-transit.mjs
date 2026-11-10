// Seoul's station service includes search, nearby stops and both upcoming buses.
// Official specification: https://www.data.go.kr/data/15000303/openapi.do
const base = 'http://ws.bus.go.kr/api/rest/stationinfo/';
const cache = new Map();
const reply = (data, status = 200) => Response.json(data, {status, headers:{'Cache-Control':'no-store'}});
const approvalMessage = '서울 버스 연결을 확인할 수 없어요. 활용신청 승인 직후라면 잠시 후 다시 시도해주세요.';
const number = value => value !== '' && value != null && Number.isFinite(Number(value)) ? Number(value) : null;
const arsId = value => /^\d{1,5}$/.test(String(value ?? '')) && Number(value) > 0 ? String(value).padStart(5, '0') : null;
function stop(row) {
  const id = arsId(row.arsId), name = row.stNm || row.stationNm;
  if (!id || !name) return null;
  const lat = number(row.gpsY ?? row.tmY), lng = number(row.gpsX ?? row.tmX);
  return {id, name:String(name), number:id, cityCode:'11', lat:lat >= 33 && lat <= 39 ? lat : null, lng:lng >= 124 && lng <= 132 ? lng : null};
}
export function seoulArrivals(rows) {
  return rows.flatMap(row => {
    if (!row.busRouteId || !row.rtNm) return [];
    const arrivals = [1,2].map(index => {
      const message = String(row['arrmsg'+index] || row['arrmsgSec'+index] || '').trim();
      const minutes = message.match(/(\d+)\s*분/), seconds = message.match(/(\d+)\s*초/), stops = message.match(/\[(\d+)\s*번째\s*전\]/);
      // Never treat absent or end-of-service estimates as a bus arriving now.
      const eta = /곧\s*도착|잠시\s*후\s*도착/.test(message) ? 0 : minutes || seconds ? Number(minutes?.[1] || 0)*60+Number(seconds?.[1] || 0) : null;
      return {routeId:String(row.busRouteId)+(row.staOrd?':'+row.staOrd:''), number:String(row.rtNm), type:'', seconds:eta, stops:stops?Number(stops[1]):null, vehicle:String(row['busType'+index])==='1'?'저상버스':'', direction:String(row.adirection||''), message:eta===null?(message || '도착 정보 없음'):undefined};
    });
    const timed = arrivals.filter(a=>a.seconds!==null);
    return timed.length ? timed : [arrivals[0]];
  }).sort((a,b)=>(a.seconds??Infinity)-(b.seconds??Infinity));
}
async function provider(path, params, fetcher) {
  const response = await fetcher(base+path+'?'+params, {signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw Error(approvalMessage);
  let body;
  try { body = JSON.parse(await response.text()); } catch { throw Error(approvalMessage); }
  const data = body.ServiceResult || body;
  const code = String(data.msgHeader?.headerCd ?? '');
  if (code === '4') return [];
  if (code !== '0') throw Error(approvalMessage);
  const items = data.msgBody?.itemList;
  return items ? (Array.isArray(items) ? items : [items]) : [];
}
export async function handleSeoul(action, p, env, fetcher) {
  const key = env.SEOUL_SERVICE_KEY || env.TAGO_SERVICE_KEY;
  if (!key) return reply({message:'서울 버스 정보 연결을 준비하고 있어요.'},503);
  let decoded; try { decoded = decodeURIComponent(key.trim()); } catch { decoded = key.trim(); }
  const params = new URLSearchParams({serviceKey:decoded,resultType:'json'});
  let path, ttl = 20000, page = 1;
  if (action === 'stops') {
    const q = (p.get('q')||'').trim(); page = Number(p.get('page')||1);
    if (!q || q.length>50 || !Number.isInteger(page) || page<1 || page>100) return reply({message:'정류장 이름이나 번호를 입력해주세요.'},400);
    if (/^[\d-]+$/.test(q)) {
      const id = arsId(q.replaceAll('-',''));
      if (!id) return reply({message:'정류장 번호 5자리를 입력해주세요.'},400);
      path='getStationByUid'; params.set('arsId',id);
    } else { path='getStationByName'; params.set('stSrch',q); }
    ttl=300000;
  } else if (action === 'nearby') {
    const lat=number(p.get('lat')), lng=number(p.get('lng'));
    if(lat===null || lng===null || lat<33 || lat>39 || lng<124 || lng>132) return reply({message:'국내에서 이용해주세요. 정류장 이름으로도 검색할 수 있어요.'},400);
    path='getStationByPos'; params.set('tmX',String(lng)); params.set('tmY',String(lat)); params.set('radius','500'); ttl=60000;
  } else {
    const id=arsId(p.get('id'));
    if (!id) return reply({message:'정류장을 다시 선택해주세요.'},400);
    path='getStationByUid'; params.set('arsId',id);
  }
  const cacheKey=action+':'+p.toString(), entry=cache.get(cacheKey);
  if(entry && Date.now()-entry.at<ttl) return reply(entry.data);
  try {
    const rows = await provider(path,params,fetcher);
    let result;
    if(action==='arrivals') result={items:seoulArrivals(rows)};
    else {
      const seen=new Set(), stops=rows.map(stop).filter(s=>s&&!seen.has(s.id)&&seen.add(s.id));
      result={items:stops.slice((page-1)*100,page*100),total:stops.length,page};
    }
    result.fetchedAt=new Date().toISOString();
    if(cache.size>300)cache.clear(); cache.set(cacheKey,{at:Date.now(),data:result});
    return reply(result);
  } catch { return reply({message:approvalMessage},502); }
}
