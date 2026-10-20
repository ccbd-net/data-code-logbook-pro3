import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '@/features/triplog/Workspace';
import { pageHead } from '@/features/triplog/logic';
export const Route=createFileRoute('/users')({head:()=>pageHead('ইউজার ম্যানেজমেন্ট'),component:Page});
function Page(){return <Workspace page="users"/>;}
