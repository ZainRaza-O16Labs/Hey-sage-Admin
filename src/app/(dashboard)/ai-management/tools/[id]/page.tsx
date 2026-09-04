import { notFound } from "next/navigation";
import { Puzzle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AIStatusBadge } from "@/components/ai-management/ai-status-badge";

type RouteParams = Promise<{ id: string }>;

export default async function ToolDetailPage({ params }: { params: RouteParams }) {
  const { id } = await params;

  let tool = null;
  try {
    const response = await fetch(`${process.env.SERVER_URL || "http://localhost:3002"}/api/ai-management/tools/${id}`);
    if (response.ok) {
      const data = (await response.json()) as { tool: { id: string; name: string; key: string; description: string; status: string; created_at: string; updated_at: string } };
      tool = data.tool;
    }
  } catch {
    // Tool not available
  }

  if (!tool) notFound();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <AiPageHeader
        title={tool.name}
        description={tool.description || "Tool configuration and assignment details."}
        action={
          <Button variant="outline" nativeButton={false} render={<Link href="/ai-management/tools" />}>
            <ArrowLeft className="size-4" />
            Back to Tools
          </Button>
        }
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
              Tool implementation is managed by the Mastra backend. This page controls configuration and assignment only.
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
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Puzzle className="size-5" />
            </div>
            <p className="text-sm font-medium">Assignment not yet available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tool-to-agent assignment will be available once the backend schema supports it.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
