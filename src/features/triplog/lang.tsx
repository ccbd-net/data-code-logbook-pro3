import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {STR,STR2,type Lang} from './logic';
type Ctx={lang:Lang;setLang:(l:Lang)=>void};
const LangContext=createContext<Ctx>({lang:'bn',setLang:()=>{}});
export function LangProvider({children}:{children:ReactNode}){
 const [lang,setLangState]=useState<Lang>('bn');
 useEffect(()=>{const saved=window.localStorage.getItem('triplog-lang');if(saved==='en'||saved==='bn')setLangState(saved);},[]);
 useEffect(()=>{document.documentElement.lang=lang;},[lang]);
 const setLang=(l:Lang)=>{setLangState(l);window.localStorage.setItem('triplog-lang',l);};
 return <LangContext.Provider value={{lang,setLang}}>{children}</LangContext.Provider>;
}
export function useLang(){const {lang,setLang}=useContext(LangContext);return {lang,setLang,t:{...STR[lang],...STR2[lang]}};}
