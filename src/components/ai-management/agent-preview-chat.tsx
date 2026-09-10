"use client";

import { useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Live per-agent test through the real runtime (any lifecycle state).
 * Conversations are never persisted from the preview.
 */
export function AgentPreviewChat({ agentId }: { agentId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const userMessage = input.trim();
    if (!userMessage || sending) return;
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setSending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, message: userMessage, mode: "preview" }),
      });
      const payload = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Agent test chat failed.");
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: payload.reply ?? "No response." },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test chat failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="max-h-[420px] min-h-[220px] flex flex-col gap-3 overflow-y-auto rounded-lg border p-4">
        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Send a message to test this agent through the real runtime.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex max-w-[85%] items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  {msg.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                </div>
                <div className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          rows={2}
          className="min-h-0 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <Button onClick={() => void handleSend()} disabled={!input.trim() || sending} size="icon">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}