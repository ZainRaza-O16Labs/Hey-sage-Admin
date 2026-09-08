import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Bot, Edit, Puzzle, BookOpen, FileText, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AIStatusBadge } from "@/components/ai-management/ai-status-badge";
import { AiAgentDeleteButton } from "@/components/ai-management/ai-agent-delete-button";
import { getAgent } from "@/lib/agents/store";
import { listDocuments } from "@/lib/agents/documents";
import { isUuid } from "@/lib/agents/schema";
import {
  listAgentKnowledgeBaseAssignments,
  listToolsByAgent,
} from "@/lib/ai-management/store";
import { useRouter } from "next/navigation";

type RouteParams = Promise<{ id: string }>;

export default function AgentDetailPage({ params }: { params: RouteParams }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const router = useRouter();

  let agent;
  try {
    agent = await getAgent(id);
  } catch {
    notFound();
  }
  if (!agent) notFound();

  const [documents, tools, knowledgeBaseIds] = await Promise.all([
    listDocuments(id),
    listToolsByAgent(id),
    listAgentKnowledgeBaseAssignments(id),
  ]);
  const editHref = `/ai-management/agents/${agent.id}/edit`;
  const previewHref = `/ai-management/agents/${agent.id}/preview`;
  const config = agent.configuration ?? {};
  const configKnowledgeBaseIds = Array.isArray(config.knowledge_base_ids)
    ? config.knowledge_base_ids.filter((kbId): kbId is string => typeof kbId === "string")
    : [];
  const knowledgeBaseCount =
    knowledgeBaseIds.length > 0 ? knowledgeBaseIds.length : configKnowledgeBaseIds.length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* Back button at the top */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => router.back()}
        aria-label="Back"
        className="rounded-md p-1.5 hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="size-4 shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M15.293 7.293a1 1 0 01-1.414 0L10 10.586 5.293 5.293a1 1 0 01-1.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414z" />
        </svg>
      </Button>

      <AiPageHeader
        title={agent.name}
        description={agent.description || "No description provided."}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={previewHref} />}>
              <Send className="size-4" />
              Test Agent
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href={editHref} />}>
              <Edit className="size-4" />
              Edit Agent
            </Button>
            <AiAgentDeleteButton id={agent.id} name={agent.name} />
          </div>
        }
      />

      {/* Lifecycle notice */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
          <div className="flex items-center gap-3">
            <AIStatusBadge status={agent.lifecycle_status} />
            <span className="text-sm text-muted-foreground">
              {agent.lifecycle_status === "published"
                ? "This agent can be reached by users through the AI Router."
                : "Only admin testing can reach this agent until it is published."}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Operational</span>
            <AIStatusBadge status={agent.status} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Bot className="size-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>Agent Details</CardTitle>
                <CardDescription>Configuration and status information.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Lifecycle</p>
                <div className="mt-1"><AIStatusBadge status={agent.lifecycle_status} /></div>
              </div>
              <div>
                <p className="text-sm font-medium">Operational status</p>
                <div className="mt-1"><AIStatusBadge status={agent.status} /></div>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium">Description</p>
              <p className="mt-1 text-sm text-muted-foreground">{agent.description || "No description"}</p>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="mt-1 text-sm text-muted-foreground">{new Date(agent.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Updated</p>
                <p className="mt-1 text-sm text-muted-foreground">{new Date(agent.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Puzzle className="size-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>Tools & Knowledge</CardTitle>
                <CardDescription>Resources connected to this agent.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm">Tools assigned</span>
              <Badge variant={tools.length > 0 ? "default" : "secondary"}>{tools.length}</Badge>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm">Documents</span>
              <Badge variant={documents.length > 0 ? "default" : "secondary"}>{documents.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Knowledge bases</span>
              <Badge variant={knowledgeBaseCount > 0 ? "default" : "secondary"}>{knowledgeBaseCount}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <BookOpen className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Instructions</CardTitle>
              <CardDescription>The system instruction that guides this agent's behavior.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {agent.instructions ? (
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed text-muted-foreground">
              {agent.instructions}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">No instructions configured.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Knowledge Documents</CardTitle>
              <CardDescription>Files uploaded for retrieval-augmented generation.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm font-medium">No documents uploaded</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload PDF or Markdown files to provide knowledge context.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{doc.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : ""} · {doc.chunk_count} chunks
                    </p>
                  </div>
                  <Badge variant={doc.status === "ready" ? "default" : doc.status === "error" ? "destructive" : "secondary"}>
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
