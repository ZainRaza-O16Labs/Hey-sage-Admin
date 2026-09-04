"use client";

import { useEffect, useState } from "react";
import { Send, ChevronDown, ChevronRight, Bot, User } from "lucide-react";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { Agent } from "@/lib/agents/schema";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type DebugStep = {
  label: string;
  detail: string;
};

export default function PlaygroundPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data: { agents?: Agent[] }) => setAgents(data.agents ?? []))
      .catch(() => {});
  }, []);

  async function handleSend() {
    if (!input.trim() || !selectedAgentId) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setSending(true);

    setDebugSteps([
      { label: "Prompt", detail: userMessage },
      { label: "Parent Agent", detail: "Routing request..." },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgentId, message: userMessage }),
      });

      if (response.ok) {
        const data = (await response.json()) as { response?: string };
        const reply = data.response ?? "No response from the agent.";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        setDebugSteps((prev) => [
          ...prev,
          { label: "Final Response", detail: reply },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Playground chat is not available yet. The backend chat API is needed to test agents here." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Playground chat is not available yet. The backend chat API is needed to test agents here." }]);
    } finally {
      setSending(false);
    }
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <AiPageHeader
        title="Playground"
        description="Test an agent with execution details and debug information."
      />

      <Card>
        <CardHeader>
          <CardTitle>Agent Selection</CardTitle>
          <CardDescription>Choose an agent to chat with in the playground.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 space-y-2">
              <NativeSelect
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                aria-label="Select agent"
                className="w-full"
              >
                <option value="">Select an agent...</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          {selectedAgent && (
            <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium">{selectedAgent.name}</p>
              <p className="text-muted-foreground">{selectedAgent.description || "No description"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Status: {selectedAgent.status} · Instructions: {selectedAgent.instructions.length > 0 ? "configured" : "not configured"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <div className="mb-4 flex min-h-[300px] max-h-[500px] flex-col gap-3 overflow-y-auto rounded-lg border p-4">
              {messages.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Select an agent and send a message to start testing.</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`flex max-w-[80%] items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        {msg.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                      </div>
                      <div className={`rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedAgentId ? "Type a message..." : "Select an agent first"}
                disabled={!selectedAgentId || sending}
                rows={2}
                className="min-h-0 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
              />
              <Button
                onClick={() => void handleSend()}
                disabled={!selectedAgentId || !input.trim() || sending}
                size="icon"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <button
            onClick={() => setDebugOpen(!debugOpen)}
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <CardTitle className="text-sm">Debug Panel</CardTitle>
            {debugOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
          {debugOpen && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                {debugSteps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No execution trace yet.</p>
                ) : (
                  debugSteps.map((step, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <p className="text-xs font-medium text-muted-foreground">{step.label}</p>
                      <p className="mt-1 text-sm">{step.detail}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Execution flow</p>
                {["Prompt", "Parent Agent", "Category", "Agent", "Tool", "Tool Result", "RAG", "Retrieved Documents", "Final Response"].map((step) => (
                  <div key={step} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-1.5 rounded-full bg-muted-foreground/30" />
                    {step}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
