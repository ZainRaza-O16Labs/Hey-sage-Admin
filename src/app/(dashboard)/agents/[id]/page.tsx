import { redirect } from "next/navigation";

type RouteParams = Promise<{ id: string }>;

export default async function AgentPage({ params }: { params: RouteParams }) {
  const { id } = await params;
  redirect(`/ai-management/agents/${id}`);
}
