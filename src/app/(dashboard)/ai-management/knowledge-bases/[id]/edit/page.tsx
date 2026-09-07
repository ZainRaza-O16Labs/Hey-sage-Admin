import { notFound } from "next/navigation";
import { AiKnowledgeBaseEditPage } from "@/components/ai-management/ai-knowledge-base-edit-page";
import { isUuid } from "@/lib/agents/schema";

type RouteParams = Promise<{ id: string }>;

export default async function EditKnowledgeBasePage({ params }: { params: RouteParams }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  return <AiKnowledgeBaseEditPage knowledgeBaseId={id} />;
}