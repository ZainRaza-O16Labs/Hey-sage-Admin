import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { getAgent } from "@/lib/agents/store";
import { isUuid } from "@/lib/agents/schema";

type RouteParams = Promise<{ id: string }>;

export default async function AgentToolsPage({ params }: { params: RouteParams }) {
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
        title={`${agent.name} — Tools`}
        description="Assign and manage tools for this agent."
        action={
          <Button variant="outline" nativeButton={false} render={<Link href={`/ai-management/agents/${id}`} />}>
            <ArrowLeft className="size-4" />
            Back to Agent
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Assigned Tools</CardTitle>
          <CardDescription>Tools currently assigned to this agent.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Puzzle className="size-5" />
            </div>
            <p className="text-sm font-medium">No tools assigned</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Tool assignment will be available once the backend schema supports linking tools to agents.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Tools</CardTitle>
          <CardDescription>Tools registered in the backend that can be assigned.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-medium">Tool registry not available</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Available tools will be listed here once the backend tool registry is exposed via API.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
