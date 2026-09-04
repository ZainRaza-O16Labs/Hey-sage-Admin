"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Agent } from "@/lib/agents/schema";

export function AiAgentsPageContent() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);

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
  }, []);

  function agentHref(agent: Agent) {
    return `/ai-management/agents/${agent.id}`;
  }

  function agentEditHref(agent: Agent) {
    return `/ai-management/agents/${agent.id}/edit`;
  }

  const filtered = agents.filter((agent) => {
    const matchesQuery = `${agent.name} ${agent.description}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === "all" || agent.status === statusFilter);
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
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-40">Updated</TableHead>
                    <TableHead className="w-[1%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((agent) => (
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
                      <TableCell>
                        <AIStatusBadge status={agent.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(agent.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={agentHref(agent)} />}>
                            View
                          </Button>
                          <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={agentEditHref(agent)} />}>
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
                  ))}
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
