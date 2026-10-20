import {createContext,useContext,type ReactNode,useState,useEffect} from 'react';
import type {Session} from '@supabase/supabase-js';
import {supabase} from '@/integrations/supabase/client';
import {useQueryClient} from '@tanstack/react-query';
import {useRouter} from '@tanstack/react-router';
const SessionContext=createContext<Session|null>(null);
export function SessionProvider({children}:{children:ReactNode}){const [session,setSession]=useState<Session|null>(null);const queryClient=useQueryClient();const router=useRouter();useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));const {data}=supabase.auth.onAuthStateChange((event,s)=>{if(!['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event))return;setSession(s);router.invalidate();if(event!=='SIGNED_OUT')queryClient.invalidateQueries();});return ()=>data.subscription.unsubscribe();},[queryClient,router]);return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;}
export const useSession=()=>useContext(SessionContext);
