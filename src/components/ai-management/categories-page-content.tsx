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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Agent } from "@/lib/agents/schema";
import type { AiCategory } from "@/lib/ai-management/store";
import { notifyError, notifySuccess } from "@/lib/notify";

export function CategoriesPageContent() {
  const router = useRouter();
  const [categories, setCategories] = useState<AiCategory[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<AiCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai-management/categories");
      if (!response.ok) throw new Error("Failed to load categories");
      const data = (await response.json()) as { categories: AiCategory[] };
      setCategories(data.categories ?? []);
      try {
        const [agentsRes, kbsRes] = await Promise.all([
          fetch("/api/agents").catch(() => null),
          fetch("/api/ai-management/knowledge-bases").catch(() => null),
        ]);
        if (agentsRes?.ok) {
          const d = await agentsRes.json();
          setAgents(d.agents ?? []);
        }
        if (kbsRes?.ok) {
          await kbsRes.json();
        }
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load categories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = categories.filter((cat) => {
    const matchesQuery = `${cat.name} ${cat.description}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === "all" || cat.status === statusFilter);
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/ai-management/categories/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not delete category.");
      }
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      notifySuccess("Category deleted successfully.");
      router.refresh();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Failed to delete category.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleStatus(cat: AiCategory) {
    const newStatus = cat.status === "active" ? "inactive" : "active";
    try {
      const response = await fetch(`/api/ai-management/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not update category status.");
      }
      const data = (await response.json()) as { category: AiCategory };
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? data.category : c)));
      notifySuccess(
        newStatus === "active" ? "Category activated successfully." : "Category deactivated successfully.",
      );
      router.refresh();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Failed to update category status.");
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <AiPageHeader
        title="Categories"
        description="Organize specialized agents into logical areas of your AI system."
        action={
          <Button nativeButton={false} render={<Link href="/ai-management/categories/new" />}>
            <Plus className="size-4" />
            Create Category
          </Button>
        }
      />

      {loading ? (
        <AISkeleton />
      ) : error ? (
        <AIErrorState description={error} onRetry={() => void load()} />
      ) : categories.length === 0 ? (
        <AIEmptyState
          title="No categories found"
          description="Create your first category to organize agents into logical groups."
          actionHref="/ai-management/categories/new"
          actionLabel="Create Category"
        />
      ) : (
        <Card>
          <AIFilterBar
            query={query}
            onQueryChange={setQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchPlaceholder="Search categories..."
            searchLabel="Search categories"
          />
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium">No categories found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search or filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-56">Name</TableHead>
                    <TableHead className="w-24 text-center">Agents</TableHead>
                    <TableHead className="w-28 text-center">Knowledge Bases</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-[1%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((cat) => {
                    const catHref = `/ai-management/categories/${cat.id}`;
                    const editHref = `/ai-management/categories/${cat.id}/edit`;
                    const agentCount = agents.filter(
                      (a) =>
                        a.category_id === cat.id ||
                        (a.configuration?.category_id && a.configuration.category_id === cat.id),
                    ).length;
                    const kbIds = new Set<string>();
                    agents
                      .filter(
                        (a) =>
                          a.category_id === cat.id ||
                          (a.configuration?.category_id && a.configuration.category_id === cat.id),
                      )
                      .forEach((a) => {
                        const ids = Array.isArray(a.configuration?.knowledge_base_ids)
                          ? (a.configuration?.knowledge_base_ids as string[])
                          : [];
                        ids.forEach((id) => kbIds.add(id));
                      });
                    return (
                    <TableRow key={cat.id}>
                      <TableCell className="min-w-0 max-w-xl whitespace-normal">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <Link href={catHref} className="w-fit font-medium text-foreground hover:underline">
                            {cat.name}
                          </Link>
                          <p className="line-clamp-2 text-sm text-muted-foreground" title={cat.description || undefined}>
                            {cat.description || "No description"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{agentCount}</TableCell>
                      <TableCell className="text-center">{kbIds.size}</TableCell>
                      <TableCell>
                        <AIStatusBadge status={cat.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={catHref} />}>
                            View
                          </Button>
                          <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={editHref} />}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void handleToggleStatus(cat)}>
                            {cat.status === "active" ? "Deactivate" : "Activate"}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(cat)}>
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
        title="Delete Category"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        loading={deleting}
      />
    </div>
  );
}
