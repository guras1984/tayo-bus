'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
const InstallContext=createContext({installed:false,available:false,install:async()=>{}});
export function AppInstallProvider({children}:{children:ReactNode}){
 const [prompt,setPrompt]=useState<InstallPrompt|null>(null),[installed,setInstalled]=useState(false);
 useEffect(()=>{
  const media=window.matchMedia('(display-mode: standalone)');
  const update=()=>setInstalled(media.matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone)||navigator.userAgent.includes('TayoAndroid/'));
  const capture=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt);};
  const done=()=>{setInstalled(true);setPrompt(null);};update();
  window.addEventListener('beforeinstallprompt',capture);window.addEventListener('appinstalled',done);media.addEventListener('change',update);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
  return()=>{window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',done);media.removeEventListener('change',update);};
 },[]);
 async function install(){if(!prompt)return;try{await prompt.prompt();const result=await prompt.userChoice;if(result.outcome==='accepted')setInstalled(true);}finally{setPrompt(null);}}
 return <InstallContext.Provider value={{installed,available:Boolean(prompt),install}}>{children}</InstallContext.Provider>;
}
export function BrowserInstallButton(){const {installed,available,install}=useContext(InstallContext);return installed?<p className="install-success">앱으로 실행 중이에요.</p>:available?<button className="install-secondary" onClick={()=>void install()}>브라우저에서 앱 설치</button>:null;}
