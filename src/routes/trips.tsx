import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '@/features/triplog/Workspace';
import { pageHead } from '@/features/triplog/logic';
export const Route=createFileRoute('/trips')({head:()=>pageHead('ট্রিপ লগ'),component:Page});
function Page(){return <Workspace page="trips"/>;}
