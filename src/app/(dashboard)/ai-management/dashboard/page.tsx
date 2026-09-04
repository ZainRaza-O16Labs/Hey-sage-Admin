import Link from "next/link";
import { Bot, FileText, Layers, Settings2, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentsStoreError, getAgentDashboardStats } from "@/lib/agents/store";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

function unavailableMetric(label: string, description: string) {
  return { label, value: "—", description, icon: Workflow };
}

export default async function AiDashboardPage() {
  let stats: Awaited<ReturnType<typeof getAgentDashboardStats>> | null = null;
  let errorMessage: string | null = null;
  if (isSupabaseAdminConfigured()) {
    try {
      stats = await getAgentDashboardStats();
    } catch (error) {
      errorMessage = error instanceof AgentsStoreError ? error.message : "Could not load AI metrics.";
    }
  } else {
    errorMessage = "Supabase service role is not configured.";
  }

  const metrics = stats
    ? [
        { label: "Agents", value: stats.total, description: `${stats.active} active`, icon: Bot },
        { label: "Knowledge documents", value: stats.documents.total, description: `${stats.documents.ready} indexed`, icon: FileText },
        { label: "Vector chunks", value: stats.documents.totalChunks, description: "Searchable segments", icon: Layers },
        unavailableMetric("Categories", "Not available in current schema"),
        unavailableMetric("Tools", "Not available in current schema"),
        unavailableMetric("Conversations today", "Execution metrics not exposed"),
      ]
    : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">AI Management</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">A live view of configured agents and searchable knowledge.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/ai-management/settings" />}><Settings2 className="size-4" />Settings</Button>
        </div>
      </div>

      {errorMessage ? (
        <Card><CardContent className="py-8"><p className="text-sm text-destructive">{errorMessage}</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return <Card key={metric.label}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><p className="text-2xl font-semibold">{metric.value}</p><CardDescription className="mt-1">{metric.description}</CardDescription></CardContent>
            </Card>;
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Configuration status</CardTitle><CardDescription>Current resources that can be managed in this admin.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3"><span className="text-sm">Agent instructions</span><Badge variant={stats?.agents.every((agent) => agent.hasInstruction) ? "default" : "secondary"}>{stats ? `${stats.agents.filter((agent) => agent.hasInstruction).length}/${stats.agents.length} configured` : "Unavailable"}</Badge></div>
            <div className="flex items-center justify-between border-b pb-3"><span className="text-sm">Knowledge indexing</span><Badge variant="secondary">{stats ? `${stats.documents.ready} indexed` : "Unavailable"}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-sm">Categories and tool registry</span><Badge variant="outline">Schema required</Badge></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quick actions</CardTitle><CardDescription>Jump into the existing configuration workflow.</CardDescription></CardHeader>
          <CardContent className="flex flex-col items-start gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href="/agents/new" />}>Create Agent</Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/ai-management/parent-agent" />}>Configure Parent Agent</Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/ai-management/playground" />}>Open Playground</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
