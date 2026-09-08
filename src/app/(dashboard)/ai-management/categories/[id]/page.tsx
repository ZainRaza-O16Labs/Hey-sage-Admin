import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, Edit, Puzzle, BookOpen, FileText, Send, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackNav } from "@/components/ai-management/back-nav";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AIStatusBadge } from "@/components/ai-management/ai-status-badge";
import { AiManagementStoreError, getCategory } from "@/lib/ai-management/store";
import { listAgents } from "@/lib/agents/store";
import { getAgentDocumentCounts } from "@/lib/agents/documents";

type RouteParams = Promise<{ id: string }>;

export default async function CategoryDetailPage({ params }: { params: RouteParams }) {
  const { id } = await params;

  let category;
  try {
    category = await getCategory(id);
  } catch (error) {
    if (error instanceof AiManagementStoreError && error.status === 404) {
      notFound();
    }
    notFound();
  }
  if (!category) notFound();

  const editHref = `/ai-management/categories/${category.id}/edit`;

  let agents: Awaited<ReturnType<typeof listAgents>> = [];
  let documentCountByAgent: Record<string, number> = {};
  try {
    const allAgents = await listAgents();
    agents = allAgents.filter((a) => a.category_id === id);
  } catch {
    // Agents table may not exist yet
  }
  try {
    documentCountByAgent = await getAgentDocumentCounts();
  } catch {
    // Documents table may not exist yet
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <BackNav href="/ai-management/categories" label="Categories" />
      <AiPageHeader
        title={category.name}
        description={category.description || "No description provided."}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={editHref} />}>
              <Edit className="size-4" />
              Edit Category
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
          <CardDescription>Configuration and instructions for this category.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Status</span>
            <AIStatusBadge status={category.status} />
          </div>
          {category.description && (
            <div>
              <p className="text-sm font-medium">Description</p>
              <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
            </div>
          )}
          {category.instructions && (
            <div>
              <p className="text-sm font-medium">Instructions</p>
              <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground">
                {category.instructions}
              </pre>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Created</p>
              <p className="mt-1 text-sm text-muted-foreground">{new Date(category.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Updated</p>
              <p className="mt-1 text-sm text-muted-foreground">{new Date(category.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Agents in this Category</CardTitle>
            <CardDescription>Specialized agents that belong to this category.</CardDescription>
          </div>
          <Button size="sm" nativeButton={false} render={<Link href={`/ai-management/agents/new?category=${id}`} />}>
            <Plus className="size-4" />
            Add Agent
          </Button>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bot className="size-5" />
              </div>
              <p className="text-sm font-medium">No agents in this category</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create an agent and assign it to this category to see it here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {agents.map((agent) => {
                const config = agent.configuration ?? {};
                const toolsCount = Array.isArray(config.tools) ? config.tools.length : 0;
                const kbIds = Array.isArray(config.knowledge_base_ids) ? config.knowledge_base_ids : [];
                const kbCount = kbIds.length;

                return (
                  <div key={agent.id} className="flex flex-col gap-3 rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/ai-management/agents/${agent.id}`} className="text-sm font-medium hover:underline">
                          {agent.name}
                        </Link>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {agent.description || "No description"}
                        </p>
                      </div>
                      <AIStatusBadge status={agent.status} />
                    </div>
<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Puzzle className="size-3" /> {toolsCount} tools
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="size-3" /> {kbCount} KBs
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="size-3" /> {documentCountByAgent[agent.id] ?? 0} documents
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          <Link href={`/ai-management/agents/${agent.id}/edit`} className="flex items-center gap-1">
                            <Edit className="size-3" /> Edit
                          </Link>
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Link href={`/ai-management/agents/${agent.id}/tools`} className="flex items-center gap-1">
                            <Puzzle className="size-3" /> Manage Tools
                          </Link>
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Link href={`/ai-management/agents/${agent.id}/knowledge`} className="flex items-center gap-1">
                            <BookOpen className="size-3" /> Manage KB
                          </Link>
                        </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Link href={`/ai-management/agents/${agent.id}/preview`} className="flex items-center gap-1">
                          <Send className="size-3" /> Preview
                        </Link>
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
