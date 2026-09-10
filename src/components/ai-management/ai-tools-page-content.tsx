"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AIEmptyState } from "@/components/ai-management/ai-empty-state";
import { AIErrorState } from "@/components/ai-management/ai-error-state";
import { AISkeleton } from "@/components/ai-management/ai-skeleton";
import { AIStatusBadge } from "@/components/ai-management/ai-status-badge";
import { AIFilterBar } from "@/components/ai-management/ai-filter-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AiTool } from "@/lib/ai-management/tools";
import { notifyError, notifySuccess } from "@/lib/notify";

type PendingKey = string | null;

export function AiToolsPageContent() {
  const router = useRouter();
  const [tools, setTools] = useState<AiTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pending, setPending] = useState<PendingKey>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai-management/tools");
      if (!response.ok) {
        setTools([]);
        return;
      }
      const data = (await response.json()) as { tools: AiTool[] };
      setTools(data.tools ?? []);
    } catch {
      setTools([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function toggleStatus(tool: AiTool) {
    const nextStatus = tool.status === "active" ? "inactive" : "active";
    setPending(tool.id);
    try {
      const response = await fetch(`/api/ai-management/tools/${tool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = (await response.json()) as {
        tool?: AiTool;
        error?: string;
      };
      if (!response.ok || !data.tool) {
        notifyError(data.error ?? "Failed to update tool.");
        return;
      }
      setTools((prev) =>
        prev.map((t) => (t.id === tool.id ? data.tool! : t)),
      );
      notifySuccess(
        nextStatus === "active"
          ? "Tool activated successfully."
          : "Tool deactivated successfully.",
      );
      router.refresh();
    } catch {
      notifyError("Failed to update tool.");
    } finally {
      setPending(null);
    }
  }

  const filtered = tools.filter((tool) => {
    const matchesQuery = `${tool.name} ${tool.key} ${tool.description}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === "all" || tool.status === statusFilter);
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <AiPageHeader
        title="Tools"
        description="Review backend-managed tools and assign them to specialized agents."
      />

      {loading ? (
        <AISkeleton />
      ) : tools.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium">No tools configured yet.</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Tools appear here once they are registered in the Mastra backend.
                Backend implementation is managed by developers. This page controls
                tool configuration and assignment only.
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
            searchPlaceholder="Search tools..."
            searchLabel="Search tools"
          />
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium">No tools found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search or filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-48">Tool</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-[1%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tool) => (
                    <TableRow key={tool.id}>
                      <TableCell className="min-w-0 max-w-xl whitespace-normal">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <Link href={`/ai-management/tools/${tool.id}`} className="w-fit font-medium text-foreground hover:underline">
                            {tool.name}
                          </Link>
                          <p className="line-clamp-2 text-sm text-muted-foreground" title={tool.description || undefined}>
                            {tool.description || "No description"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <AIStatusBadge status={tool.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            nativeButton={false}
                            render={<Link href={`/ai-management/tools/${tool.id}`} />}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant={tool.status === "active" ? "outline" : "default"}
                            disabled={pending === tool.id}
                            onClick={() => void toggleStatus(tool)}
                          >
                            {pending === tool.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : tool.status === "active" ? (
                              "Deactivate"
                            ) : (
                              "Activate"
                            )}
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
    </div>
  );
}
