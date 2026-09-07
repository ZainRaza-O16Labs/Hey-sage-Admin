"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { fetchConversations } from "@/lib/ai-management/conversations-store";
import type { AiConversationRecord } from "@/lib/ai-management/conversations-store";

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<AiConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AiConversationRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai-management/conversations");
      if (!response.ok) throw new Error("Failed to load conversations");
      const data = (await response.json()) as { conversations: AiConversationRecord[] };
      setConversations(data.conversations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load conversations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = conversations.filter((conv) => {
    const search = `${conv.agent_name ?? ""} ${conv.category_name ?? ""}`.toLowerCase().includes(
      query.toLowerCase(),
    );
    return search && (query === "" || true);
  });

  async function handleDelete(orgId: string, id: string) {
    setDeleteTarget({ orgId, id });
    setError(null);
    try {
      await fetch(`/api/ai-management/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setDeleteTarget(null);
    } catch {
      setError("Delete failed.");
      setDeleteTarget(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <AiPageHeader
        title="Conversations"
        description="Agent conversation history and analytics."
      />

      {loading ? (
        <div className="skeleton h-64 rounded-blg"/>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">
            No conversations yet. Messages appear as agents interact with users.
          </p>
        </div>
      ) : (
        <Card>
          <AIFilterBar
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search conversations..."
            searchLabel="Search conversations"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conversation</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="w-40">Messages</TableHead>
                <TableHead className="w-[1%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((conv) => (
                <TableRow key={conv.id}>
                  <TableCell>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link
                        href={`/ai-management/conversations/${conv.id}`}
                        className="font-medium hover:underline"
                      >
                        {conv.agent_name ?? "Unknown agent"}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {conv.category_name || ""}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{conv.message_count ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      nativeButton={false}
                      onClick={() => void handleDelete(conv.organization_id, conv.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </Card>
      )}
    </div>
  );
}