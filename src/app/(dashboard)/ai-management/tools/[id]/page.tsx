import { notFound } from "next/navigation";
import { Puzzle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BackNav } from "@/components/ai-management/back-nav";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AIStatusBadge } from "@/components/ai-management/ai-status-badge";
import { getTool, listAgentsByTool } from "@/lib/ai-management/store";

type RouteParams = Promise<{ id: string }>;

export default async function ToolDetailPage({ params }: { params: RouteParams }) {
  const { id } = await params;

  const tool = await getTool(id);
  if (!tool) notFound();

  let agents: Array<{ id: string; name: string }> = [];
  try {
    agents = await listAgentsByTool(id);
  } catch {
    agents = [];
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <BackNav href="/ai-management/tools" label="Tools" />
      <AiPageHeader
        title={tool.name}
        description={tool.description || "Tool configuration and assignment details."}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Puzzle className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Tool Details</CardTitle>
              <CardDescription>Configuration and status information.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <AIStatusBadge status={tool.status} />
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium">Tool Key</p>
            <code className="mt-1 block rounded bg-muted p-2 text-xs">{tool.key}</code>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium">Description</p>
            <p className="mt-1 text-sm text-muted-foreground">{tool.description || "No description"}</p>
          </div>
          <Separator />
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
            <Badge variant="outline">Backend Managed</Badge>
            <p className="text-xs text-muted-foreground">
              Backend implementation is managed by developers. This page controls tool configuration and assignment only.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
            <Badge variant={tool.status === "active" ? "default" : "secondary"}>
              {tool.status === "active" ? "Available at runtime" : "Not available at runtime"}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {tool.status === "active"
                ? "This tool is active and executes for assigned agents that have access."
                : "This tool is inactive. Assigned agents keep the assignment, but the tool is never executed."}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Created</p>
              <p className="mt-1 text-sm text-muted-foreground">{new Date(tool.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Updated</p>
              <p className="mt-1 text-sm text-muted-foreground">{new Date(tool.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Agents</CardTitle>
          <CardDescription>Agents that have access to this tool.</CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Puzzle className="size-5" />
              </div>
              <p className="text-sm font-medium">No tools assigned</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Assign this tool to an agent from the agent&apos;s Tools tab.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {agents.map((agent) => (
                <li key={agent.id}>
                  <Link
                    href={`/ai-management/agents/${agent.id}`}
                    className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Puzzle className="size-4" />
                    </div>
                    <span className="text-sm font-medium truncate">{agent.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}