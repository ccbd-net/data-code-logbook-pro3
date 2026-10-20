import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '@/features/triplog/Workspace';
import { pageHead } from '@/features/triplog/logic';
export const Route=createFileRoute('/report')({head:()=>pageHead('ট্রিপ সমন্বয় রিপোর্ট'),component:Page});
function Page(){return <Workspace page="report"/>;}
