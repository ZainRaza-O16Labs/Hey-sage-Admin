import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  FileText,
  Layers,
  PauseCircle,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DashboardStats, getDashboardStats } from "@/lib/agents/store";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

export default async function DashboardPage() {
  const adminConfigured = isSupabaseAdminConfigured();
  let errorMessage: string | null = null;
  let stats: DashboardStats | null = null;

  if (adminConfigured) {
    try {
      stats = await getDashboardStats();
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "Could not load dashboard statistics.";
    }
  } else {
    errorMessage = "Supabase service role is not configured.";
  }

  const summaryCards = stats
    ? [
        {
          label: "Total agents",
          value: String(stats.totalAgents),
          hint: `${stats.activeAgents} active · ${stats.inactiveAgents} inactive`,
          icon: Bot,
        },
        {
          label: "Active agents",
          value: String(stats.activeAgents),
          hint: "Available to Web and Mobile clients",
          icon: CheckCircle2,
        },
        {
          label: "Total categories",
          value: String(stats.totalCategories),
          hint: `${stats.activeCategories} active · ${stats.inactiveCategories} inactive`,
          icon: Layers,
        },
        {
          label: "Total tools",
          value: String(stats.totalTools),
          hint: `${stats.activeTools} active · ${stats.inactiveTools} inactive`,
          icon: Bot,
        },
        {
          label: "Knowledge bases",
          value: String(stats.totalKnowledgeBases),
          hint: `${stats.activeKnowledgeBases} active · ${stats.inactiveKnowledgeBases} inactive`,
          icon: FileText,
        },
        {
          label: "Documents",
          value: String(stats.totalDocuments),
          hint: `${stats.readyDocuments} ready · ${stats.processingDocuments + stats.pendingDocuments} in queue`,
          icon: Layers,
        },
        {
          label: "Vector chunks",
          value: String(stats.totalChunks),
          hint: "Searchable knowledge segments in pgvector",
          icon: Layers,
        },
        {
          label: "Conversations",
          value: String(stats.totalConversations),
          hint: `${stats.activeConversations} active · ${stats.inactiveConversations} inactive`,
          icon: Bot,
        },
      ]
    : [];

  function renderEmptyState(label: string, description: string, href: string) {
    return (
      <div className="flex flex-col items-start gap-3 py-6">
        <p className="text-sm text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <Button
          nativeButton={false}
          render={<Link href={href}>Create {label}</Link>}
        >
          Create {label}
        </Button>
      </div>
    );
  }

  function formatDate(value: string | undefined) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agent configuration and knowledge base overview.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/agents/new" />}>
          <Plus className="size-4" />
          Create Agent
        </Button>
      </div>

      {errorMessage ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.label}
                    </CardTitle>
                    <Icon className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">{stat.value}</p>
                    <CardDescription className="mt-1">{stat.hint}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Agents</CardTitle>
                <CardDescription>
                  Status, knowledge files, and indexed chunks per agent.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {stats.agents.length === 0 ? (
                renderEmptyState(
                  "Agents",
                  "Create one to configure instructions and knowledge.",
                  "/agents/new"
                )
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-28">Instruction</TableHead>
                      <TableHead className="w-24 text-right">Files</TableHead>
                      <TableHead className="w-24 text-right">Chunks</TableHead>
                      <TableHead className="w-28">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <Link
                            href={`/agents/${agent.id}`}
                            className="font-medium hover:underline"
                          >
                            {agent.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              agent.status === "active" ? "default" : "secondary"
                            }
                          >
                            {agent.status === "active" ? (
                              <CheckCircle2 />
                            ) : (
                              <PauseCircle />
                            )}
                            {agent.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={agent.hasInstruction ? "outline" : "destructive"}
                          >
                            {agent.hasInstruction ? "Configured" : "Missing"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {agent.documentCount}
                          {agent.readyDocuments < agent.documentCount ? (
                            <span className="text-muted-foreground">
                              {" "}
                              ({agent.readyDocuments} ready)
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {agent.chunkCount}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(agent.updated_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  Organizational groups for agents.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {stats.totalCategories === 0 ? (
                renderEmptyState(
                  "Categories",
                  "Create categories to organize agents into logical groups.",
                  "/ai-management/categories/new"
                )
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-40">Agents</TableHead>
                      <TableHead className="w-[1%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.inactiveCategories === 0 ? [] : null}
                    {(() => {
                      // We need category data - let's just show count for now
                      // TODO: fetch categories if needed
                      return (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <p className="text-sm text-muted-foreground">
                              Categories data would appear here. Use the Categories page
                              to manage them.
                            </p>
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Tools</CardTitle>
                <CardDescription>
                  Backend-managed tools assignable to agents.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {stats.totalTools === 0 ? (
                renderEmptyState(
                  "Tools",
                  "Tools will appear here once registered in the Mastra backend.",
                  "/ai-management/tools"
                )
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tool</TableHead>
                      <TableHead className="w-32">Key</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      <TableHead className="w-32">Assigned Agents</TableHead>
                      <TableHead className="w-[1%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.inactiveTools === 0 ? [] : null}
                    {(() => {
                      // We need tool data - show count for now
                      return (
                        <TableRow>
                          <TableCell colSpan={7}>
                            <p className="text-sm text-muted-foreground">
                              Tools data would appear here. Use the Tools page to manage them.
                            </p>
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Knowledge Bases</CardTitle>
                <CardDescription>
                  Organize reusable knowledge and connect to agents.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {stats.totalKnowledgeBases === 0 ? (
                renderEmptyState(
                  "Knowledge Bases",
                  "Create knowledge bases to store documents and assign to agents.",
                  "/ai-management/knowledge-bases/new"
                )
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Knowledge Base</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      <TableHead className="w-40">Documents</TableHead>
                      <TableHead className="w-[1%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.inactiveKnowledgeBases === 0 ? [] : null}
                    {(() => {
                      // We need KB data - show count for now
                      return (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <p className="text-sm text-muted-foreground">
                              Knowledge bases data would appear here. Use the KB page to manage them.
                            </p>
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Conversations</CardTitle>
                <CardDescription>
                  Agent conversation history.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {stats.totalConversations === 0 ? (
                renderEmptyState(
                  "Conversations",
                  "No conversations yet. Messages appear as agents interact with users.",
                  "/ai-management/conversations"
                )
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conversation</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead className="w-40">Messages</TableHead>
                      <TableHead className="w-[1%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.inactiveConversations === 0 ? [] : null}
                    {(() => {
                      // We need conversation data - show count for now
                      return (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <p className="text-sm text-muted-foreground">
                              Conversations data would appear here. Use the Conversations page
                              to manage them.
                            </p>
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}