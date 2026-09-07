"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Bot, User, MessageSquare, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AISkeleton } from "@/components/ai-management/ai-skeleton";
import { useRouter } from "next/navigation";

type ConversationMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type Conversation = {
  id: string;
  agent_id: string;
  agent_name?: string;
  category_name?: string;
  message_count: number;
  created_at: string;
  updated_at: string;
};

export default function ConversationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/ai-management/conversations/${id}`)
      .then(async (r) => {
        if (r.status === 404) throw new Error("not-found");
        if (!r.ok) {
          const payload = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? "Could not load conversation.");
        }
        return r.json();
      })
      .then((data: { conversation?: Conversation; messages?: ConversationMessage[] }) => {
        if (!active) return;
        setConversation(data.conversation ?? null);
        setMessages(data.messages ?? []);
      })
      .catch((caught: Error) => {
        if (!active) return;
        setError(caught.message || "Could not load conversation.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function handleDelete() {
    if (!window.confirm("Delete this conversation and all its messages?")) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/ai-management/conversations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Could not delete conversation.");
      }
      router.push("/ai-management/conversations");
      router.refresh();
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : "Could not delete conversation.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <AiPageHeader title="Conversation Detail" description="Loading…" />
        <AISkeleton />
      </div>
    );
  }

  if (error === "not-found" || !conversation) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <AiPageHeader
          title="Conversation Detail"
          description="Conversation not found."
          action={
            <Button variant="outline" nativeButton={false} render={<Link href="/ai-management/conversations" />}>
              <ArrowLeft className="size-4" />
              Back to Conversations
            </Button>
          }
        />
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            This conversation no longer exists.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AiPageHeader
          title="Conversation Detail"
          description={`Conversation ${conversation.id.slice(0, 8)}… with ${conversation.agent_name ?? "unknown agent"}.`}
          action={
            <Button variant="outline" nativeButton={false} render={<Link href="/ai-management/conversations" />}>
              <ArrowLeft className="size-4" />
              Back to Conversations
            </Button>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversation Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Agent</span>
            <span className="text-sm text-muted-foreground">{conversation.agent_name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Category</span>
            <span className="text-sm text-muted-foreground">{conversation.category_name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Messages</span>
            <Badge variant="secondary">{conversation.message_count}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Updated</span>
            <span className="text-sm text-muted-foreground">{new Date(conversation.updated_at).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Messages</CardTitle>
            <CardDescription>Full conversation transcript.</CardDescription>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            <Trash2 className="size-4" />
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="mb-3 size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No messages</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This conversation has no persisted messages.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {message.role === "assistant" ? (
                      <Bot className="size-4" />
                    ) : (
                      <User className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-medium capitalize text-muted-foreground">
                        {message.role}
                      </span>
                      <span className="text-xs text-muted-foreground/60">
                        {new Date(message.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
