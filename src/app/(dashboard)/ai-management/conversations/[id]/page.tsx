"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Bot, User, MessageSquare, Trash2, Wrench, ChevronDown, ChevronRight } from "lucide-react";
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
import { BackNav } from "@/components/ai-management/back-nav";
import { AISkeleton } from "@/components/ai-management/ai-skeleton";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useRouter } from "next/navigation";

type ConversationMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type ConversationToolCall = {
  id: string;
  tool_key: string;
  tool_name: string;
  input: Record<string, unknown>;
  status: "success" | "error";
  output: unknown | null;
  error_message: string | null;
  created_at: string;
};

type Conversation = {
  id: string;
  agent_id: string;
  user_id?: string | null;
  agent_name?: string;
  category_name?: string;
  message_count: number;
  created_at: string;
  updated_at: string;
};

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function ConversationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<ConversationToolCall[]>([]);
  const [toolCallsLoaded, setToolCallsLoaded] = useState(false);
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<string>>(new Set());
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
      .then((data: { conversation?: Conversation; messages?: ConversationMessage[]; toolCalls?: ConversationToolCall[] }) => {
        if (!active) return;
        setConversation(data.conversation ?? null);
        setMessages(data.messages ?? []);
        setToolCalls(data.toolCalls ?? []);
        setToolCallsLoaded(true);
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
      notifySuccess("Conversation deleted successfully.");
      router.push("/ai-management/conversations");
      router.refresh();
    } catch (caught) {
      notifyError(caught instanceof Error ? caught.message : "Could not delete conversation.");
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
        <BackNav href="/ai-management/conversations" label="Conversations" />
        <AiPageHeader
          title="Conversation Detail"
          description="Conversation not found."
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
      <BackNav href="/ai-management/conversations" label="Conversations" />
      <AiPageHeader
        title="Conversation Detail"
        description={`Conversation ${conversation.id.slice(0, 8)}… with ${conversation.agent_name ?? "unknown agent"}.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Conversation Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">User</span>
            <span className="truncate text-sm text-muted-foreground">
              {conversation.user_id ?? "—"}
            </span>
          </div>
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wrench className="size-4 text-muted-foreground" />
            <CardTitle>Tool Calls</CardTitle>
          </div>
          <CardDescription>
            Backend tool executions recorded for this conversation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!toolCallsLoaded ? (
            <p className="py-4 text-sm text-muted-foreground">Loading tool telemetry…</p>
          ) : toolCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Wrench className="mb-3 size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No tool calls recorded</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No backend tool executions were observed for this conversation.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {toolCalls.map((toolCall) => {
                const isExpanded = expandedToolCalls.has(toolCall.id);
                return (
                  <li key={toolCall.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedToolCalls((prev) => {
                          const next = new Set(prev);
                          if (next.has(toolCall.id)) {
                            next.delete(toolCall.id);
                          } else {
                            next.add(toolCall.id);
                          }
                          return next;
                        })
                      }
                      className="flex w-full items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {toolCall.tool_name || toolCall.tool_key}
                          </span>
                          <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {toolCall.tool_key}
                          </code>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {new Date(toolCall.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={toolCall.status === "success" ? "secondary" : "destructive"}>
                        {toolCall.status}
                      </Badge>
                    </button>
                    {isExpanded && (
                      <div className="mt-1 space-y-2 rounded-lg border border-dashed p-3 text-xs">
                        <div>
                          <p className="mb-1 font-medium text-muted-foreground">Input</p>
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 font-mono text-xs">
                            {safeJson(toolCall.input)}
                          </pre>
                        </div>
                        {toolCall.status === "success" ? (
                          <div>
                            <p className="mb-1 font-medium text-muted-foreground">Output</p>
                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 font-mono text-xs">
                              {toolCall.output === null || toolCall.output === undefined
                                ? "No output recorded."
                                : safeJson(toolCall.output)}
                            </pre>
                          </div>
                        ) : (
                          <div>
                            <p className="mb-1 font-medium text-muted-foreground">Error</p>
                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-destructive/10 p-2 font-mono text-xs text-destructive">
                              {toolCall.error_message ?? "Unknown error."}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
