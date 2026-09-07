"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AIEmptyState } from "@/components/ai-management/ai-empty-state";
import { AISkeleton } from "@/components/ai-management/ai-skeleton";
import { AIFilterBar } from "@/components/ai-management/ai-filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Conversation = {
  id: string;
  agent_id: string;
  agent_name?: string;
  category_name?: string;
  message_count: number;
  created_at: string;
  updated_at: string;
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch("/api/ai-management/conversations")
      .then((r) => {
        if (r.ok) return r.json();
        return { conversations: [] };
      })
      .then((data: { conversations?: Conversation[] }) => {
        setConversations(data.conversations ?? []);
      })
      .catch(() => {
        setConversations([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = conversations.filter((conv) => {
    const search = `${conv.id} ${conv.agent_name ?? ""} ${conv.category_name ?? ""}`.toLowerCase();
    return search.includes(query.toLowerCase());
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <AiPageHeader
        title="Conversations"
        description="View and manage chat and voice conversations across agents."
      />

      {loading ? (
        <AISkeleton />
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Conversation and voice history will appear here once users start chatting
                with agents through the app.
              </p>
              <Button className="mt-4" variant="outline" nativeButton={false} render={<Link href="/ai-management/playground" />}>
                Open Playground
              </Button>
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
            statusOptions={[{ value: "all", label: "All conversations" }]}
            searchPlaceholder="Search conversations..."
            searchLabel="Search conversations"
          />
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium">No conversations found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">ID</TableHead>
                    <TableHead className="w-40">Agent</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    <TableHead className="w-24">Messages</TableHead>
                    <TableHead className="w-40">Date</TableHead>
                    <TableHead className="w-[1%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((conv) => (
                    <TableRow key={conv.id}>
                      <TableCell className="font-mono text-xs">{conv.id.slice(0, 8)}...</TableCell>
                      <TableCell>{conv.agent_name ?? "—"}</TableCell>
                      <TableCell>{conv.category_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{conv.message_count}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(conv.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/ai-management/conversations/${conv.id}`} />}>
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
