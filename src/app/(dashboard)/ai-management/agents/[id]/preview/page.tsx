import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AIStatusBadge } from "@/components/ai-management/ai-status-badge";
import { getAgent } from "@/lib/agents/store";
import { isUuid } from "@/lib/agents/schema";

type RouteParams = Promise<{ id: string }>;

export default async function AgentPreviewPage({ params }: { params: RouteParams }) {
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
        title={`${agent.name} — Preview`}
        description="Review the full agent configuration and test interactions."
        action={
          <Button variant="outline" nativeButton={false} render={<Link href={`/ai-management/agents/${id}`} />}>
            <ArrowLeft className="size-4" />
            Back to Agent
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Bot className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Agent Configuration</CardTitle>
              <CardDescription>Full configuration summary for this agent.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="mt-1 text-sm text-muted-foreground">{agent.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Status</p>
              <div className="mt-1"><AIStatusBadge status={agent.status} /></div>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium">Description</p>
            <p className="mt-1 text-sm text-muted-foreground">{agent.description || "No description"}</p>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium">Instructions</p>
            {agent.instructions ? (
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground max-h-48 overflow-y-auto">
                {agent.instructions}
              </pre>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No instructions configured.</p>
            )}
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center">
              <Badge variant="secondary">0 Tools</Badge>
            </div>
            <div className="text-center">
              <Badge variant="secondary">0 Knowledge Bases</Badge>
            </div>
            <div className="text-center">
              <Badge variant="secondary">0 Documents</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chat Preview</CardTitle>
          <CardDescription>Test this agent with a sample interaction.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-medium">Preview unavailable</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Live chat preview requires the backend chat API to be available.
              Use the Playground to test agent interactions.
            </p>
            <Button className="mt-4" variant="outline" nativeButton={false} render={<Link href="/ai-management/playground" />}>
              Open Playground
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
