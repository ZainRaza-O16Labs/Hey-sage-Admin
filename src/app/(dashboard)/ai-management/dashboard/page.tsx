import Link from "next/link";
import { Bot, Braces, Database, FileText, MessageSquareText, Puzzle, Search, Settings2, Sparkles, Workflow, Wrench } from "lucide-react";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AIStatsCard } from "@/components/ai-management/ai-stats-card";
import { AIEmptyState } from "@/components/ai-management/ai-empty-state";
import { AIPageActions } from "@/components/ai-management/ai-page-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentsStoreError, getAgentDashboardStats } from "@/lib/agents/store";
import { listCategories, listTools, DEFAULT_ORGANIZATION_ID } from "@/lib/ai-management/store";
import { countConversationsSince, countToolCalls } from "@/lib/ai-management/conversations-store";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

export default async function AiDashboardPage() {
  let stats: Awaited<ReturnType<typeof getAgentDashboardStats>> | null = null;
  let categoryCount = 0;
  let toolsCount = 0;
  let activeToolsCount = 0;
  let todayConversationsCount = 0;
  let toolCallsCount: number | null = null;
  let errorMessage: string | null = null;

  if (isSupabaseAdminConfigured()) {
    try {
      stats = await getAgentDashboardStats();
    } catch (error) {
      errorMessage = error instanceof AgentsStoreError ? error.message : "Could not load AI metrics.";
    }
    try {
      const categories = await listCategories();
      categoryCount = categories.length;
    } catch {
      // Categories table may not exist yet
    }
    try {
      const tools = await listTools();
      toolsCount = tools.length;
      activeToolsCount = tools.filter((tool) => tool.status === "active").length;
    } catch {
      // Tools table may not exist yet
    }
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      todayConversationsCount = await countConversationsSince(
        DEFAULT_ORGANIZATION_ID,
        startOfToday.toISOString(),
      );
    } catch {
      // Conversation tables may not exist yet
    }
    try {
      toolCallsCount = await countToolCalls(DEFAULT_ORGANIZATION_ID);
    } catch {
      // Telemetry table may not exist yet
    }
  } else {
    errorMessage = "Supabase service role is not configured.";
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AiPageHeader
          title="Dashboard"
          description="Manage your AI Router, categories, specialized agents, tools, knowledge bases, and conversations."
        />
        <AIPageActions
          actions={[
            { label: "Create Category", href: "/ai-management/categories/new", icon: <Braces className="size-4" /> },
            { label: "Create Agent", href: "/ai-management/agents/new", icon: <Bot className="size-4" /> },
            { label: "Add Knowledge Base", href: "/ai-management/knowledge-bases/new", icon: <Database className="size-4" /> },
            { label: "Open Playground", href: "/ai-management/playground", icon: <Sparkles className="size-4" /> },
          ]}
        />
      </div>

      {errorMessage ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AIStatsCard
              label="Categories"
              value={categoryCount}
              description="Organized agent groups"
              icon={Braces}
            />
            <AIStatsCard
              label="Agents"
              value={stats?.total ?? 0}
              description={`${stats?.active ?? 0} active, ${stats?.inactive ?? 0} inactive`}
              icon={Bot}
            />
            <AIStatsCard
              label="Tools"
              value={toolsCount}
              description={`${activeToolsCount} active`}
              icon={Puzzle}
            />
            <AIStatsCard
              label="Knowledge Documents"
              value={stats?.documents.total ?? 0}
              description={`${stats?.documents.ready ?? 0} indexed`}
              icon={FileText}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AIStatsCard
              label="Active Agents"
              value={stats?.active ?? 0}
              description="Ready to handle requests"
              icon={Bot}
            />
            <AIStatsCard
              label="Active Tools"
              value={activeToolsCount}
              description="Enabled and routable"
              icon={Puzzle}
            />
            <AIStatsCard
              label="Today's Conversations"
              value={todayConversationsCount}
              description="Conversations created today"
              icon={MessageSquareText}
            />
            <AIStatsCard
              label="Tool Calls"
              value={toolCallsCount === null ? "—" : toolCallsCount}
              description={
                toolCallsCount === null
                  ? "No execution telemetry recorded"
                  : "Backend tool executions"
              }
              icon={Wrench}
            />
            <AIStatsCard
              label="RAG Searches"
              value="—"
              description="No execution telemetry recorded"
              icon={Search}
            />
          </div>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Configuration status</CardTitle>
            <CardDescription>Current resources that can be managed in this admin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm">Agent instructions</span>
              <Badge variant={stats?.agents.every((a) => a.hasInstruction) ? "default" : "secondary"}>
                {stats ? `${stats.agents.filter((a) => a.hasInstruction).length}/${stats.agents.length} configured` : "Unavailable"}
              </Badge>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm">Knowledge indexing</span>
              <Badge variant="secondary">{stats ? `${stats.documents.ready} indexed` : "Unavailable"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Categories</span>
              <Badge variant={categoryCount > 0 ? "default" : "secondary"}>
                {categoryCount > 0 ? `${categoryCount} categories` : "None configured"}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across your AI system.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats && stats.agents.length > 0 ? (
              <div className="space-y-3">
                {stats.agents.slice(0, 5).map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {agent.documentCount} documents · {agent.chunkCount} chunks
                      </p>
                    </div>
                    <Badge variant={agent.status === "active" ? "default" : "secondary"}>{agent.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <AIEmptyState
                title="No activity yet"
                description="Activity will appear here as you configure agents and knowledge bases."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
