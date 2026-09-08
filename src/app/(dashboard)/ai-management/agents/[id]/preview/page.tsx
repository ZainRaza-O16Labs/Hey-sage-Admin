import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BackNav } from "@/components/ai-management/back-nav";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AIStatusBadge } from "@/components/ai-management/ai-status-badge";
import { AgentPreviewChat } from "@/components/ai-management/agent-preview-chat";
import { getAgent } from "@/lib/agents/store";
import { listDocuments } from "@/lib/agents/documents";
import { isUuid } from "@/lib/agents/schema";
import {
  listAgentKnowledgeBaseAssignments,
  listToolsByAgent,
  getCategory,
  getKnowledgeBase,
} from "@/lib/ai-management/store";

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

  const [tools, knowledgeBaseIds, documents, category] = await Promise.all([
    listToolsByAgent(id),
    listAgentKnowledgeBaseAssignments(id),
    listDocuments(id),
    agent.category_id ? getCategory(agent.category_id).catch(() => null) : Promise.resolve(null),
  ]);
  const config = agent.configuration ?? {};
  const configKnowledgeBaseIds = Array.isArray(config.knowledge_base_ids)
    ? config.knowledge_base_ids.filter((kbId): kbId is string => typeof kbId === "string")
    : [];
  const resolvedKbIds = knowledgeBaseIds.length > 0 ? knowledgeBaseIds : configKnowledgeBaseIds;
  const knowledgeBaseCount = resolvedKbIds.length;

  const knowledgeBases = await Promise.all(
    resolvedKbIds.map((kbId) => getKnowledgeBase(kbId).catch(() => null)),
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <BackNav href={`/ai-management/agents/${id}`} label="Agent" />
      <AiPageHeader
        title={`${agent.name} — Preview`}
        description="Review the full agent configuration and test interactions."
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="mt-1 text-sm text-muted-foreground">{agent.name}</p>
            </div>
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
            <p className="text-sm font-medium">Category</p>
            {category ? (
              <Link href={`/ai-management/categories/${category.id}`} className="mt-1 inline-block text-sm text-primary hover:underline">
                {category.name}
              </Link>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">None</p>
            )}
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
          <div>
            <p className="text-sm font-medium">Tools</p>
            {tools.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {tools.map((tool) => (
                  <Badge key={tool.id} variant="secondary">{tool.name}</Badge>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No tools assigned.</p>
            )}
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium">Knowledge Bases</p>
            {knowledgeBases.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {knowledgeBases.map((kb) =>
                  kb ? (
                    <Badge key={kb.id} variant="secondary">
                      <Link href={`/ai-management/knowledge-bases/${kb.id}`} className="hover:underline">
                        {kb.name}
                      </Link>
                    </Badge>
                  ) : null,
                )}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No knowledge bases assigned.</p>
            )}
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center">
              <Badge variant={tools.length > 0 ? "default" : "secondary"}>{tools.length} Tools</Badge>
            </div>
            <div className="text-center">
              <Badge variant={knowledgeBaseCount > 0 ? "default" : "secondary"}>{knowledgeBaseCount} Knowledge Bases</Badge>
            </div>
            <div className="text-center">
              <Badge variant={documents.length > 0 ? "default" : "secondary"}>{documents.length} Documents</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chat Preview</CardTitle>
          <CardDescription>
            Test this agent through the real runtime. Draft and unpublished agents are testable here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgentPreviewChat agentId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
