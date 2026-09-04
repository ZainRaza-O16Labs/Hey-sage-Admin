import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { getAgent } from "@/lib/agents/store";
import { isUuid } from "@/lib/agents/schema";

type RouteParams = Promise<{ id: string }>;

export default async function AgentKnowledgePage({ params }: { params: RouteParams }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  let agent;
  try {
    agent = await getAgent(id);
  } catch {
    notFound();
  }
  if (!agent) notFound();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <AiPageHeader
        title={`${agent.name} — Knowledge`}
        description="Assign knowledge bases and configure RAG settings for this agent."
        action={
          <Button variant="outline" nativeButton={false} render={<Link href={`/ai-management/agents/${id}`} />}>
            <ArrowLeft className="size-4" />
            Back to Agent
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Assigned Knowledge Bases</CardTitle>
          <CardDescription>Knowledge bases currently connected to this agent.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Database className="size-5" />
            </div>
            <p className="text-sm font-medium">No knowledge bases assigned</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Knowledge base assignment will be available once the backend schema supports it.
              Currently, knowledge documents can be uploaded directly on the agent detail page.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RAG Configuration</CardTitle>
          <CardDescription>Retrieval-augmented generation settings for this agent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-sm font-medium">Enable RAG</span>
            <span className="text-sm text-muted-foreground">Not configurable yet</span>
          </div>
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-sm font-medium">Top K</span>
            <span className="text-sm text-muted-foreground">Uses global default</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Similarity Threshold</span>
            <span className="text-sm text-muted-foreground">Uses global default</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Retrieval only uses knowledge bases assigned to this agent. Per-agent RAG configuration will be available once the backend supports it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
