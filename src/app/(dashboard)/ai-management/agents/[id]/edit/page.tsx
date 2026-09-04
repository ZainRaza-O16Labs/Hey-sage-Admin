import { notFound } from "next/navigation";
import { AiAgentEditPage } from "@/components/ai-management/ai-agent-edit-page";
import { getAgent } from "@/lib/agents/store";
import { isUuid } from "@/lib/agents/schema";

type RouteParams = Promise<{ id: string }>;

export default async function EditAgentPage({ params }: { params: RouteParams }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  let agent;
  try {
    agent = await getAgent(id);
  } catch {
    notFound();
  }
  if (!agent) notFound();

  return <AiAgentEditPage agent={agent} />;
}
