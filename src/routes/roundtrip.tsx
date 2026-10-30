import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '@/features/triplog/Workspace';
import { pageHead } from '@/features/triplog/logic';
export const Route=createFileRoute('/roundtrip')({head:()=>pageHead('রাউন্ড ট্রিপ ডাটাবেজ'),component:Page});
function Page(){return <Workspace page="roundtrip"/>;}
