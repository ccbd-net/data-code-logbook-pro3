import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '@/features/triplog/Workspace';
import { pageHead } from '@/features/triplog/logic';
export const Route=createFileRoute('/fuel')({head:()=>pageHead('ফুয়েল লগ'),component:Page});
function Page(){return <Workspace page="fuel"/>;}
