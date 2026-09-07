"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AIEmptyState } from "@/components/ai-management/ai-empty-state";
import { AIErrorState } from "@/components/ai-management/ai-error-state";
import { AISkeleton } from "@/components/ai-management/ai-skeleton";
import { AIStatusBadge } from "@/components/ai-management/ai-status-badge";
import { AIFilterBar } from "@/components/ai-management/ai-filter-bar";
import { AIConfirmDialog } from "@/components/ai-management/ai-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Agent } from "@/lib/agents/schema";
import type { AiCategory } from "@/lib/ai-management/store";
import type { AiTool } from "@/lib/ai-management/tools";
import type { AiKnowledgeBase } from "@/lib/ai-management/knowledge-bases";
import { fetchCategories } from "@/lib/ai-management/categories";
import { fetchTools } from "@/lib/ai-management/tools";
import { fetchKnowledgeBases } from "@/lib/ai-management/knowledge-bases";

type RuntimeIds = {
  categoryId?: string;
  toolIds: string[];
  knowledgeBaseIds: string[];
};

function runtimeIds(agent: Agent): RuntimeIds {
  const config = agent.configuration ?? {};
  const tools = Array.isArray(config.tools) ? config.tools.filter((t): t is string => typeof t === "string") : [];
  const knowledgeBaseIds = Array.isArray(config.knowledge_base_ids)
    ? config.knowledge_base_ids.filter((k): k is string => typeof k === "string")
    : [];
  return {
    categoryId: agent.category_id ?? (typeof config.category_id === "string" ? config.category_id : "all"),
    toolIds: tools,
    knowledgeBaseIds,
  };
}

export function AiAgentsPageContent() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [categories, setCategories] = useState<AiCategory[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<AiKnowledgeBase[]>([]);
  const [tools, setTools] = useState<AiTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lifecycleFilter, setLifecycleFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const knowledgeBaseNameById = useMemo(
    () => new Map(knowledgeBases.map((kb) => [kb.id, kb.name])),
    [knowledgeBases],
  );
  const toolNameById = useMemo(
    () => new Map(tools.map((tool) => [tool.id, tool.name])),
    [tools],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/agents");
      if (!response.ok) throw new Error("Failed to load agents");
      const data = (await response.json()) as { agents: Agent[] };
      setAgents(data.agents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load agents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    let active = true;
    Promise.all([
      fetchCategories().catch(() => [] as AiCategory[]),
      fetchKnowledgeBases().catch(() => [] as AiKnowledgeBase[]),
      fetchTools().catch(() => [] as AiTool[]),
    ]).then(([cats, kbs, toolList]) => {
      if (!active) return;
      setCategories(cats);
      setKnowledgeBases(kbs);
      setTools(toolList);
    });
    return () => {
      active = false;
    };
  }, []);

  const filtered = agents.filter((agent) => {
    const matchesQuery = `${agent.name} ${agent.description}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
    const matchesLifecycle =
      lifecycleFilter === "all" || agent.lifecycle_status === lifecycleFilter;
    return matchesQuery && matchesStatus && matchesLifecycle;
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/agents/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not delete agent.");
      }
      setAgents((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      router.refresh();
    } catch {
      // Error handled inline
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleStatus(agent: Agent) {
    const newStatus = agent.status === "active" ? "inactive" : "active";
    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Could not update status.");
      const data = (await response.json()) as { agent: Agent };
      setAgents((prev) => prev.map((a) => (a.id === agent.id ? data.agent : a)));
      router.refresh();
    } catch {
      // Error handled inline
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <AiPageHeader
        title="Agents"
        description="Create and manage specialized AI agents with unique instructions, tools, and knowledge."
        action={
          <Button nativeButton={false} render={<Link href="/ai-management/agents/new" />}>
            <Plus className="size-4" />
            Create Agent
          </Button>
        }
      />

      {loading ? (
        <AISkeleton />
      ) : error ? (
        <AIErrorState description={error} onRetry={() => void load()} />
      ) : agents.length === 0 ? (
        <AIEmptyState
          title="No agents found"
          description="Create your first agent to get started with the AI management system."
          actionHref="/ai-management/agents/new"
          actionLabel="Create Agent"
        />
      ) : (
        <Card>
          <AIFilterBar
            query={query}
            onQueryChange={setQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            lifecycleFilter={lifecycleFilter}
            onLifecycleFilterChange={setLifecycleFilter}
            lifecycleOptions={[
              { value: "all", label: "All lifecycles" },
              { value: "draft", label: "Draft" },
              { value: "unpublished", label: "Unpublished" },
              { value: "published", label: "Published" },
            ]}
            searchPlaceholder="Search agents..."
            searchLabel="Search agents"
          />
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium">No agents found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search or filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-56">Agent</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    <TableHead className="w-28">Knowledge</TableHead>
                    <TableHead className="w-24">Tools</TableHead>
                    <TableHead className="w-36">Status</TableHead>
                    <TableHead className="w-40">Updated</TableHead>
                    <TableHead className="w-[1%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((agent) => {
                    const ids = runtimeIds(agent);
                    const categoryName = ids.categoryId
                      ? categoryNameById.get(ids.categoryId) ?? "—"
                      : "—";
                    return (
                      <TableRow key={agent.id}>
                        <TableCell className="min-w-0 max-w-xl whitespace-normal">
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <Link href={`/ai-management/agents/${agent.id}`} className="w-fit font-medium text-foreground hover:underline">
                              {agent.name}
                            </Link>
                            <p className="line-clamp-2 text-sm text-muted-foreground" title={agent.description || undefined}>
                              {agent.description || "No description"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {categoryName}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">{ids.knowledgeBaseIds.length}</span>
                            {ids.knowledgeBaseIds.length > 0 ? (
                              <span className="line-clamp-1 max-w-40 text-xs text-muted-foreground">
                                {ids.knowledgeBaseIds
                                  .map((id) => knowledgeBaseNameById.get(id))
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">{ids.toolIds.length}</span>
                            {ids.toolIds.length > 0 ? (
                              <span className="line-clamp-1 max-w-36 text-xs text-muted-foreground">
                                {ids.toolIds
                                  .map((id) => toolNameById.get(id))
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <AIStatusBadge status={agent.lifecycle_status} />
                            <AIStatusBadge status={agent.status} />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(agent.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/ai-management/agents/${agent.id}`} />}>
                              View
                            </Button>
                            <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/ai-management/agents/${agent.id}/preview`} />}>
                              Test
                            </Button>
                            <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/ai-management/agents/${agent.id}/edit`} />}>
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => void handleToggleStatus(agent)}>
                              {agent.status === "active" ? "Deactivate" : "Activate"}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(agent)}>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}

      <AIConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Agent"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This will also delete associated conversations and knowledge documents. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        loading={deleting}
      />
    </div>
  );
}