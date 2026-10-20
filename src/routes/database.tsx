import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '@/features/triplog/Workspace';
import { pageHead } from '@/features/triplog/logic';
export const Route=createFileRoute('/database')({head:()=>pageHead('ডাটা ম্যানুফ্যাকচার'),component:Page});
function Page(){return <Workspace page="database"/>;}
