"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AIEmptyState } from "@/components/ai-management/ai-empty-state";
import { AIErrorState } from "@/components/ai-management/ai-error-state";
import { AISkeleton } from "@/components/ai-management/ai-skeleton";
import { AIStatusBadge } from "@/components/ai-management/ai-status-badge";
import { AIFilterBar } from "@/components/ai-management/ai-filter-bar";
import { AIConfirmDialog } from "@/components/ai-management/ai-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AiKnowledgeBase } from "@/lib/ai-management/knowledge-bases";

export function AiKnowledgeBasesPageContent() {
  const [kbs, setKbs] = useState<AiKnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<AiKnowledgeBase | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai-management/knowledge-bases");
      if (!response.ok) {
        setKbs([]);
        return;
      }
      const data = (await response.json()) as { knowledgeBases: AiKnowledgeBase[] };
      setKbs(data.knowledgeBases ?? []);
    } catch {
      setKbs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = kbs.filter((kb) => {
    const matchesQuery = `${kb.name} ${kb.description}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === "all" || kb.status === statusFilter);
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/ai-management/knowledge-bases/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not delete knowledge base.");
      }
      setKbs((prev) => prev.filter((kb) => kb.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // handled inline
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleStatus(kb: AiKnowledgeBase) {
    const newStatus = kb.status === "active" ? "inactive" : "active";
    try {
      const response = await fetch(`/api/ai-management/knowledge-bases/${kb.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Could not update status.");
      const data = (await response.json()) as { knowledgeBase: AiKnowledgeBase };
      setKbs((prev) => prev.map((k) => (k.id === kb.id ? data.knowledgeBase : k)));
    } catch {
      // handled inline
    }
  }

  function kbViewHref(kbId: string) {
    return "/ai-management/knowledge-bases/" + kbId;
  }

  function kbEditHref(kbId: string) {
    return "/ai-management/knowledge-bases/" + kbId + "/edit";
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <AiPageHeader
        title="Knowledge Bases"
        description="Organize reusable knowledge and connect it to agents without duplicating documents."
        action={
          <Button nativeButton={false} render={<Link href="/ai-management/knowledge-bases/new" />}>
            <Plus className="size-4" />
            Create Knowledge Base
          </Button>
        }
      />

      {loading ? (
        <AISkeleton />
      ) : error ? (
        <AIErrorState description={error} onRetry={() => void load()} />
      ) : kbs.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium">Knowledge bases not yet available</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Knowledge base management will appear here once the backend schema supports it.
                Individual agent knowledge documents can be managed through the agent detail page.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <AIFilterBar
            query={query}
            onQueryChange={setQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchPlaceholder="Search knowledge bases..."
            searchLabel="Search knowledge bases"
          />
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium">No knowledge bases found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search or filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-56">Name</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-40">Updated</TableHead>
                    <TableHead className="w-[1%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((kb) => (
                    <TableRow key={kb.id}>
                      <TableCell className="min-w-0 max-w-xl whitespace-normal">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <Link href={kbViewHref(kb.id)} className="w-fit font-medium text-foreground hover:underline">
                            {kb.name}
                          </Link>
                          <p className="line-clamp-2 text-sm text-muted-foreground" title={kb.description || undefined}>
                            {kb.description || "No description"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell><AIStatusBadge status={kb.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(kb.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={kbViewHref(kb.id)} />}>
                            View
                          </Button>
                          <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={kbEditHref(kb.id)} />}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void handleToggleStatus(kb)}>
                            {kb.status === "active" ? "Deactivate" : "Activate"}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(kb)}>
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
        title="Delete Knowledge Base"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        loading={deleting}
      />
    </div>
  );
}
