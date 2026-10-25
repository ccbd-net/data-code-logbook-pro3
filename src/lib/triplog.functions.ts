import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { staffPassword } from '@/features/triplog/logic';
export const loadWorkspace = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async ({context}) => {
 const allLogs=[];
 for(let offset=0;;offset+=1000){const {data,error}=await context.supabase.from('log_entries').select('*').order('entry_date',{ascending:false}).order('created_at',{ascending:false}).order('id').range(offset,offset+999);if(error)throw new Error('তথ্য লোড করা যায়নি।');allLogs.push(...(data??[]));if((data?.length??0)<1000)break;}
 const [master,logs,settings,roles,staff] = await Promise.all([context.supabase.from('master_data').select('*').order('name'),context.supabase.from('log_entries').select('*').order('entry_date',{ascending:false}).order('created_at',{ascending:false}).limit(10000),context.supabase.from('fuel_settings').select('*').maybeSingle(),context.supabase.from('user_roles').select('role').eq('user_id',context.userId),context.supabase.from('staff_accounts').select('*').order('created_at',{ascending:false})]);
 const {data:access}=await context.supabase.rpc('staff_access');
 for(const result of [master,logs,settings,roles,staff]) if(result.error) throw new Error('তথ্য লোড করা যায়নি।');
 return {master:master.data??[],logs:allLogs,settings:settings.data,admin:roles.data?.some(r=>r.role==='admin')??false,staff:staff.data??[],access:(access as string|null)??null,me:(staff.data??[]).find(s=>s.user_id===context.userId)??null};
});
export const createStaff = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({code:z.string().regex(/^[a-zA-Z0-9_-]{3,30}$/),name:z.string().min(1).max(100),pin:z.string().regex(/^\d{4,12}$/),access:z.enum(['trip_operator','fuel_manager']),counter:z.string().uuid().nullable()})).handler(async({context,data})=>{
 const {data:role,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'}); if(roleError||!role) throw new Error('শুধু মাস্টার অ্যাডমিন এই কাজ করতে পারবেন।');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const code=data.code.toLowerCase();
 const {data:created,error}=await supabaseAdmin.auth.admin.createUser({email:`${code}@staff.triplog.local`,password:staffPassword(code,data.pin),email_confirm:true});
 if(error||!created.user){console.error('createUser',error?.message); throw new Error('আইডি তৈরি হয়নি। অন্য আইডি ব্যবহার করুন।');}
 const id=created.user.id;
 const account=await supabaseAdmin.from('staff_accounts').insert({user_id:id,staff_code:code,display_name:data.name,access:data.access,counter_id:data.counter});
 const assigned=account.error?account:await supabaseAdmin.from('user_roles').insert({user_id:id,role:'staff'});
 if(assigned.error){await supabaseAdmin.auth.admin.deleteUser(id); throw new Error('আইডি সংরক্ষণ হয়নি। আবার চেষ্টা করুন।');}
 return {ok:true};
});
export const setStaffActive=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({id:z.string().uuid(),active:z.boolean()})).handler(async({context,data})=>{
 const {data:role}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(!role) throw new Error('অনুমতি নেই।');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');const {error}=await supabaseAdmin.from('staff_accounts').update({active:data.active}).eq('id',data.id);if(error)throw new Error('পরিবর্তন হয়নি।');return {ok:true};
});
export const updateStaff=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({id:z.string().uuid(),access:z.enum(['trip_operator','fuel_manager']),counter:z.string().uuid().nullable()})).handler(async({context,data})=>{
 const {data:role}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(!role) throw new Error('অনুমতি নেই।');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');const {error}=await supabaseAdmin.from('staff_accounts').update({access:data.access,counter_id:data.counter}).eq('id',data.id);if(error)throw new Error('পরিবর্তন হয়নি।');return {ok:true};
});
export const editStaff=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({id:z.string().uuid(),name:z.string().min(1).max(100),pin:z.string().regex(/^\d{4,12}$/).optional()})).handler(async({context,data})=>{
 const {data:role,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(roleError||!role)throw new Error('অনুমতি নেই।');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {data:acc,error:findErr}=await supabaseAdmin.from('staff_accounts').select('user_id,staff_code').eq('id',data.id).maybeSingle();
 if(findErr||!acc)throw new Error('অ্যাকাউন্ট পাওয়া যায়নি।');
 const {error:updErr}=await supabaseAdmin.from('staff_accounts').update({display_name:data.name}).eq('id',data.id);
 if(updErr)throw new Error('পরিবর্তন হয়নি।');
 if(data.pin){const {error:pwErr}=await supabaseAdmin.auth.admin.updateUserById(acc.user_id,{password:staffPassword(acc.staff_code,data.pin)});if(pwErr)throw new Error('পিন বদলায়নি, তবে নাম সংরক্ষিত হয়েছে।');}
 return {ok:true};
});
export const deleteStaff=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({id:z.string().uuid()})).handler(async({context,data})=>{
 const {data:role,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(roleError||!role)throw new Error('অনুমতি নেই।');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {data:acc,error:findErr}=await supabaseAdmin.from('staff_accounts').select('user_id').eq('id',data.id).maybeSingle();
 if(findErr||!acc)throw new Error('অ্যাকাউন্ট পাওয়া যায়নি।');
 if(acc.user_id===context.userId)throw new Error('নিজের অ্যাকাউন্ট মোছা যাবে না।');
 const del=await supabaseAdmin.from('staff_accounts').delete().eq('id',data.id);
 if(del.error)throw new Error('মোছা যায়নি।');
 await supabaseAdmin.from('user_roles').delete().eq('user_id',acc.user_id);
 const {error:rmErr}=await supabaseAdmin.auth.admin.deleteUser(acc.user_id);
 if(rmErr)throw new Error('অ্যাকাউন্ট সম্পূর্ণভাবে মোছা যায়নি।');
 return {ok:true};
});
