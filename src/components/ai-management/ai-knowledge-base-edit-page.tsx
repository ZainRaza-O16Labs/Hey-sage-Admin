"use client";

import { KnowledgeBaseForm } from "@/components/ai-management/knowledge-base-form";

export function AiKnowledgeBaseEditPage({
  knowledgeBaseId,
}: {
  knowledgeBaseId: string;
}) {
  return <KnowledgeBaseForm mode="edit" knowledgeBaseId={knowledgeBaseId} />;
}