export type Region = {code:string;name:string};
export type Stop = {id:string;name:string;number:string;cityCode:string;lat?:number|null;lng?:number|null};
export const DEFAULT_REGION:Region={code:'25',name:'대전광역시'};
export const FAVORITES_KEY='daejeon-tayo-stops-v1';
export const REGION_KEY='tayo-region-v1';
export function readRegion(raw:string|null):Region {
 try{const v=JSON.parse(raw||'null');if(v&&/^\d{2,6}$/.test(String(v.code))&&typeof v.name==='string'&&v.name.trim())return {code:String(v.code),name:v.name};}catch{}
 return DEFAULT_REGION;
}
export function readFavorites(raw:string|null):Stop[] {
 try{const values=JSON.parse(raw||'[]');if(!Array.isArray(values))return [];
 return values.filter(s=>s&&typeof s.name==='string'&&typeof s.id==='string'&&/^[A-Za-z0-9_-]{1,40}$/.test(s.id)&&(s.cityCode?/^\d{2,6}$/.test(String(s.cityCode)):s.id.startsWith('DJB'))).map(s=>({...s,number:String(s.number||''),cityCode:String(s.cityCode||'25')})).slice(0,500);
 }catch{return [];}
}
