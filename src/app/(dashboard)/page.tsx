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
import {
  AgentsStoreError,
  getAgentDashboardStats,
} from "@/lib/agents/store";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function instructionLabel(hasInstruction: boolean) {
  return hasInstruction ? "Configured" : "Missing";
}

export default async function DashboardPage() {
  const adminConfigured = isSupabaseAdminConfigured();
  let errorMessage: string | null = null;
  let stats: Awaited<ReturnType<typeof getAgentDashboardStats>> | null = null;

  if (adminConfigured) {
    try {
      stats = await getAgentDashboardStats();
    } catch (error) {
      errorMessage =
        error instanceof AgentsStoreError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not load agent statistics.";
    }
  } else {
    errorMessage = "Supabase service role is not configured.";
  }

  const summaryCards = stats
    ? [
        {
          label: "Total agents",
          value: String(stats.total),
          hint: `${stats.active} active · ${stats.inactive} inactive`,
          icon: Bot,
        },
        {
          label: "Active agents",
          value: String(stats.active),
          hint: "Available to Web and Mobile clients",
          icon: CheckCircle2,
        },
        {
          label: "Knowledge files",
          value: String(stats.documents.total),
          hint: `${stats.documents.ready} indexed · ${stats.documents.processing + stats.documents.pending} in queue`,
          icon: FileText,
        },
        {
          label: "Vector chunks",
          value: String(stats.documents.totalChunks),
          hint: "Searchable knowledge segments in pgvector",
          icon: Layers,
        },
      ]
    : [];

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
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/agents" />}
              >
                View all
              </Button>
            </CardHeader>
            <CardContent>
              {stats.agents.length === 0 ? (
                <div className="flex flex-col items-start gap-3 py-6">
                  <p className="text-sm text-muted-foreground">
                    No agents yet. Create one to configure instructions and
                    knowledge.
                  </p>
                  <Button
                    nativeButton={false}
                    render={<Link href="/agents/new" />}
                  >
                    Create Agent
                  </Button>
                </div>
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
                            {instructionLabel(agent.hasInstruction)}
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
                          {formatDate(agent.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
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
