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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AiTool } from "@/lib/ai-management/tools";

export function AiToolsPageContent() {
  const [tools, setTools] = useState<AiTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const filtered = tools.filter((tool) => {
    const matchesQuery = `${tool.name} ${tool.key} ${tool.description}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === "all" || tool.status === statusFilter);
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
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
              <p className="text-sm font-medium">Tools are managed by the backend</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Tools will appear here once they are registered in the Mastra backend.
                Tool registration and implementation is not managed through this UI.
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
                        <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/ai-management/tools/${tool.id}`} />}>
                          View
                        </Button>
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
