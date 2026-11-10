import {handleSeoul} from './seoul-transit.mjs';
const base = 'https://apis.data.go.kr/1613000/';
const cache = new Map();
const reply = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'no-store'}});
const finite = value => value !== '' && value != null && Number.isFinite(Number(value));
function keyValue(key) { try { return decodeURIComponent(key.trim()); } catch { return key.trim(); } }
function list(body) { const items=body.items?.item; return items ? (Array.isArray(items)?items:[items]) : []; }
async function provider(path,params,fetcher) {
  const response=await fetcher(base+path+'?'+params,{signal:AbortSignal.timeout(12000)});
  if(!response.ok) throw Error('버스 정보 제공기관의 응답이 늦어지고 있어요. 잠시 후 다시 시도해주세요.');
  let data;
  try {data=JSON.parse(await response.text());} catch {throw Error('데이터 연결을 확인할 수 없어요. 잠시 후 다시 시도해주세요.');}
  const header=data?.response?.header;
  if(!header || !['00','0'].includes(String(header.resultCode))) throw Error('버스 정보를 불러올 수 없어요. 서비스 승인 상태나 이용 한도를 확인해주세요.');
  if(!data.response.body || typeof data.response.body!=='object') throw Error('버스 정보 형식을 확인할 수 없어요. 잠시 후 다시 시도해주세요.');
  return data.response.body;
}
export async function handleTransit(request, env = {}, fetcher = fetch) {
  if (request.method !== 'GET') return reply({message:'지원하지 않는 요청입니다.'}, 405);
  const url = new URL(request.url), action = url.pathname.split('/').pop(), p = url.searchParams;
  if (action === 'status') return reply({configured: Boolean(env.TAGO_SERVICE_KEY)});
  if (!['regions','stops','nearby','arrivals'].includes(action)) return reply({message:'찾을 수 없는 주소입니다.'},404);
  const cityCode=p.get('cityCode')||'25';
  if(!/^\d{2,6}$/.test(cityCode)) return reply({message:'설정에서 지역을 선택해주세요.'},400);
  if(cityCode==='11' && action!=='regions') return handleSeoul(action,p,env,fetcher);
  if (!env.TAGO_SERVICE_KEY) return reply({code:'KEY_REQUIRED',message:'버스 정보 연결을 준비하고 있어요.'},503);
  const params = new URLSearchParams({serviceKey:keyValue(env.TAGO_SERVICE_KEY),_type:'json',pageNo:'1',numOfRows:'100',cityCode});
  let path, ttl = 20_000;
  if (action === 'regions') {
    params.delete('cityCode');params.set('numOfRows','999');ttl=86_400_000;
  } else if (action === 'stops') {
    const q = (p.get('q') || '').trim(), page = Number(p.get('page') || 1);
    if (!q || q.length > 50 || !Number.isInteger(page) || page < 1 || page > 100) return reply({message:'정류장 이름이나 번호를 입력해주세요.'},400);
    params.set(/^\d+$/.test(q) ? 'nodeNo' : 'nodeNm',q);
    params.set('pageNo',String(page));ttl=300_000;
    path='BusSttnInfoInqireService/getSttnNoList';
  } else if (action === 'nearby') {
    const lat=Number(p.get('lat')),lng=Number(p.get('lng'));
    if (!finite(p.get('lat')) || !finite(p.get('lng')) || lat<33 || lat>39 || lng<124 || lng>132) return reply({message:'국내에서 이용해주세요. 정류장 이름으로도 검색할 수 있어요.'},400);
    params.delete('cityCode');params.set('gpsLati',lat.toFixed(6));params.set('gpsLong',lng.toFixed(6));
    path='BusSttnInfoInqireService/getCrdntPrxmtSttnList';ttl=60_000;
  } else {
    const id=p.get('id') || '';
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return reply({message:'정류장을 다시 선택해주세요.'},400);
    params.set('nodeId',id);path='ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList';
  }
  const cacheKey=action+':'+p.toString(), entry=cache.get(cacheKey);
  if (entry && Date.now()-entry.at<ttl) return reply(entry.data);
  try {
    let result;
    if(action==='regions') {
      const [stations,arrivals]=await Promise.all([
        provider('BusSttnInfoInqireService/getCtyCodeList',params,fetcher),
        provider('ArvlInfoInqireService/getCtyCodeList',params,fetcher)
      ]);
      const available=new Set(list(arrivals).map(r=>String(r.citycode)));
      const seen=new Set();
      result={items:list(stations).filter(r=>available.has(String(r.citycode))&&r.cityname&&!seen.has(String(r.citycode))&&seen.add(String(r.citycode))).map(r=>({code:String(r.citycode),name:String(r.cityname)})).sort((a,b)=>a.name.localeCompare(b.name,'ko'))};
      result.items=[...result.items.filter(r=>r.code!=='11'),{code:'11',name:'서울특별시'}].sort((a,b)=>a.name.localeCompare(b.name,'ko'));
    } else {
      const body=await provider(path,params,fetcher);let rows=list(body);
      if(action==='arrivals') {
        rows=rows.filter(r=>r.routeid && finite(r.arrtime) && Number(r.arrtime)>=0);
        result={items:rows.map(r=>({routeId:String(r.routeid),number:String(r.routeno),type:String(r.routetp||''),seconds:Number(r.arrtime),stops:finite(r.arrprevstationcnt)?Number(r.arrprevstationcnt):null,vehicle:String(r.vehicletp||'')})).sort((a,b)=>a.seconds-b.seconds)};
      } else {
        rows=rows.filter(r=>r.nodeid&&r.nodenm&&(action!=='nearby'||String(r.citycode)===cityCode));
        result={items:rows.map(r=>({id:String(r.nodeid),name:String(r.nodenm),number:String(r.nodeno||''),cityCode,lat:finite(r.gpslati)?Number(r.gpslati):null,lng:finite(r.gpslong)?Number(r.gpslong):null})),total:action==='nearby'?rows.length:Number(body.totalCount)||0,page:Number(params.get('pageNo'))};
      }
    }
    result.fetchedAt=new Date().toISOString();
    if(cache.size>300)cache.clear();cache.set(cacheKey,{at:Date.now(),data:result});
    return reply(result);
  } catch(error) {
    const message=error instanceof Error && !['TimeoutError','AbortError','TypeError'].includes(error.name)?error.message:'버스 정보를 가져오지 못했어요. 잠시 후 다시 시도해주세요.';
    return reply({message},502);
  }
}
