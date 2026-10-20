import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from '@/features/triplog/Workspace';
import { pageHead } from '@/features/triplog/logic';
export const Route = createFileRoute("/")({
  head: () => pageHead('ড্যাশবোর্ড'),
  component: Index,
});
function Index() { return <Workspace page="dashboard"/>; }
