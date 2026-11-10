const CACHE='tayo-offline-v1';
const OFFLINE='/offline.html';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([OFFLINE,'/icons/icon-192.png','/icons/icon-512.png'])).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('tayo-offline-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
// Real-time data is always fetched from the network. Never replay stale arrivals.
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(['/icons/icon-192.png','/icons/icon-512.png'].includes(url.pathname)){event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));return;}
 if(event.request.mode!=='navigate')return;
 event.respondWith(fetch(event.request).catch(async()=>await caches.match(OFFLINE)||Response.error()));
});
