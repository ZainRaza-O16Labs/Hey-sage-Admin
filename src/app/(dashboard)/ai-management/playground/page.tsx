"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Send,
  ChevronDown,
  ChevronRight,
  Bot,
  User,
  Info,
  Wrench,
  RotateCcw,
  Mic,
  Square,
} from "lucide-react";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { Agent } from "@/lib/agents/schema";
import type { AiCategory } from "@/lib/ai-management/store";
import { notifyError } from "@/lib/notify";
import { useVoiceConversation } from "@/hooks/use-voice-conversation";
import { ConversationStatus, SpeakerRole } from "@/lib/voice-types";

type PlaygroundMode = "text" | "voice";

type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  source?: "text" | "voice";
};

type DebugStep = { label: string; detail: string };

type BackendToolCall = {
  name: string;
  args: Record<string, unknown>;
  status: "success" | "error";
  result?: unknown;
  errorMessage?: string;
};

type Timings = {
  routingMs: number | null;
  agentResolveMs: number | null;
  llmTotalMs: number | null;
  totalMs: number;
};

const STORAGE_KEY = "hey-sage.playground.conversationId";
const MODE_STORAGE_KEY = "hey-sage.playground.mode";

export default function PlaygroundPage() {
  const [categories, setCategories] = useState<AiCategory[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(true);
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [toolCalls, setToolCalls] = useState<BackendToolCall[]>([]);
  const [lastTimings, setLastTimings] = useState<Timings | null>(null);
  const [resuming, setResuming] = useState(false);
  const [mode, setMode] = useState<PlaygroundMode>(() => {
    if (typeof window === "undefined") return "text";
    return (localStorage.getItem(MODE_STORAGE_KEY) as PlaygroundMode) || "text";
  });

  const listRef = useRef<HTMLDivElement | null>(null);
  const sendingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const appendedTranscriptIdsRef = useRef<Set<string>>(new Set());

  const voice = useVoiceConversation();

  // Load categories + agents
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/ai-management/categories").then((r) => r.json()),
      fetch("/api/agents").then((r) => r.json()),
    ])
      .then(([catData, agentData]) => {
        if (cancelled) return;
        setCategories(((catData as { categories?: AiCategory[] }).categories ?? []).filter((c) => c.status !== "inactive"));
        setAgents(((agentData as { agents?: Agent[] }).agents ?? []) as Agent[]);
      })
      .catch(() => { if (!cancelled) setLoadError("Could not load categories or agents."); });
    return () => { cancelled = true; };
  }, []);

  // Resume conversation from localStorage
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!stored) return;
    let cancelled = false;
    setResuming(true);
    type ResumePayload = { conversation?: { id: string; agent_id?: string }; messages?: Array<{ id: string; role: string; content: string }> };
    fetch(`/api/ai-management/conversations/${stored}`)
      .then(async (r) => { if (!r.ok) { localStorage.removeItem(STORAGE_KEY); return null; } return r.json() as Promise<ResumePayload> })
      .then((data) => {
        if (cancelled || !data?.conversation) return;
        setConversationId(data.conversation.id);
        if (data.conversation.agent_id) setSelectedAgentId(data.conversation.agent_id);
        setMessages((data.messages ?? []).filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
      })
      .catch(() => { localStorage.removeItem(STORAGE_KEY); })
      .finally(() => { if (!cancelled) setResuming(false); });
    return () => { cancelled = true; };
  }, []);

  // Persist mode
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);

  // Auto-scroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, voice.transcripts]);

  // Sync voice conversationId → playground conversationId
  useEffect(() => {
    if (voice.conversationId && voice.conversationId !== conversationId) {
      setConversationId(voice.conversationId);
      localStorage.setItem(STORAGE_KEY, voice.conversationId);
    }
  }, [voice.conversationId, conversationId]);

  // Append final voice transcripts to shared messages
  useEffect(() => {
    if (mode !== "voice") return;
    const finalEntries = voice.transcripts.filter((t) => t.isFinal);
    if (finalEntries.length === 0) return;

    let changed = false;
    const newMessages: ChatMessage[] = [];
    for (const entry of finalEntries) {
      if (appendedTranscriptIdsRef.current.has(entry.id)) continue;
      appendedTranscriptIdsRef.current.add(entry.id);
      if (entry.role === SpeakerRole.User && entry.text.trim()) {
        newMessages.push({ id: entry.id, role: "user", content: entry.text.trim(), source: "voice" });
        changed = true;
      } else if (entry.role === SpeakerRole.Assistant && entry.text.trim() && !entry.text.trim().startsWith("{")) {
        newMessages.push({ id: entry.id, role: "assistant", content: entry.text.trim(), source: "voice" });
        changed = true;
      }
    }
    if (changed) setMessages((prev) => [...prev, ...newMessages]);
  }, [voice.transcripts, mode]);

  const filteredAgents = (selectedCategoryId ? agents.filter((a) => a.category_id === selectedCategoryId) : agents).filter((a) => a.status === "active" && a.lifecycle_status === "published");

  function handleCategoryChange(value: string) {
    setSelectedCategoryId(value);
    if (value && !agents.some((a) => a.id === selectedAgentId && a.category_id === value)) setSelectedAgentId("");
  }

  function startNewConversation() {
    localStorage.removeItem(STORAGE_KEY);
    setConversationId(null);
    setMessages([]);
    setDebugSteps([]);
    setToolCalls([]);
    setLastTimings(null);
    appendedTranscriptIdsRef.current.clear();
    if (mode === "voice") voice.stopConversation();
  }

  // ── TEXT MODE SEND ──────────────────────────────────────────────────────
  async function handleSend() {
    const userMessage = input.trim();
    if (!userMessage || sendingRef.current) return;
    sendingRef.current = true;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage, source: "text" }]);
    setSending(true);
    setToolCalls([]);

    const selectedAgent = agents.find((a) => a.id === selectedAgentId);
    const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
    setDebugSteps([
      { label: "Prompt", detail: userMessage },
      { label: "Mode", detail: selectedAgentId ? `Explicit agent: ${selectedAgent?.name ?? selectedAgentId}` : "Automatic Parent/Router → permanent agent" },
      ...(selectedCategory ? [{ label: "Category filter", detail: selectedCategory.name }] : []),
      ...(conversationId ? [{ label: "Conversation", detail: conversationId }] : [{ label: "Conversation", detail: "new" }]),
    ]);

    const clientStarted = performance.now();
    // Placeholder assistant message rendered live as partials stream in.
    const streamId = `stream-${Date.now()}`;
    setMessages((prev) => [...prev, { id: streamId, role: "assistant", content: "…", source: "text" }]);
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ mode: "playground", stream: true, message: userMessage, agentId: selectedAgentId || undefined, conversationId: conversationId || undefined }),
        signal: abort.signal,
      });
      if (!response.ok || !response.body) {
        let detail = `Request failed with status ${response.status}.`;
        try { const p = (await response.json()) as { error?: string }; if (p.error) detail = p.error; } catch {}
        setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, content: detail, isError: true } : m)));
        setDebugSteps((prev) => [...prev, { label: "Error", detail }]);
        notifyError(detail);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const st: {
        donePayload: {
          reply?: string;
          conversationId?: string;
          agentId?: string;
          categoryId?: string | null;
          toolCalls?: BackendToolCall[];
          timings?: Timings | null;
        } | null;
        streamError: string | null;
        receivedPartial: boolean;
        ttfbs: { firstStreamedToken: number; fullResponse: number } | null;
      } = { donePayload: null, streamError: null, receivedPartial: false, ttfbs: null };
      const firstTokenAt = performance.now();

      const processBlock = (block: string): void => {
        const lines = block.split("\n");
        let event = "";
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith("event:")) event = line.slice("event:".length).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice("data:".length).trim());
        }
        const data = dataLines.join("\n");
        if (!data) return;
        try {
          const payload = JSON.parse(data) as {
            text?: string;
            done?: boolean;
            reply?: string;
            conversation_id?: string;
            agent_id?: string;
            category_id?: string | null;
            toolCalls?: BackendToolCall[];
            timings?: Timings;
            error?: string;
          };
          if (event === "message" && typeof payload.text === "string") {
            if (!st.receivedPartial) {
              st.receivedPartial = true;
              st.ttfbs = { firstStreamedToken: Math.round(performance.now() - firstTokenAt), fullResponse: 0 };
            }
            setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, content: payload.text as string } : m)));
          } else if (event === "done") {
            st.ttfbs = { firstStreamedToken: st.ttfbs?.firstStreamedToken ?? Math.round(performance.now() - firstTokenAt), fullResponse: Math.round(performance.now() - firstTokenAt) };
            st.donePayload = {
              reply: payload.reply,
              conversationId: payload.conversation_id,
              agentId: payload.agent_id,
              categoryId: payload.category_id ?? null,
              toolCalls: payload.toolCalls ?? [],
              timings: payload.timings ?? null,
            };
          } else if (event === "error") {
            st.streamError = payload.error ?? "Chat request failed.";
          }
        } catch {
          // Ignore non-JSON keepalive lines.
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          if (block.trim()) processBlock(block);
        }
        if (abort.signal.aborted) break;
      }
      buffer += decoder.decode();
      if (buffer.trim()) processBlock(buffer);

      if (st.streamError) {
        const streamErrorMsg = st.streamError;
        setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, content: streamErrorMsg, isError: true } : m)));
        setDebugSteps((prev) => [...prev, { label: "Error", detail: streamErrorMsg }]);
        notifyError(streamErrorMsg);
        return;
      }

      const done = st.donePayload;
      const reply = (done?.reply ?? "").trim();
      if (!done || !reply) {
        if (abort.signal.aborted) {
          setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, content: m.content === "…" ? "Stopped." : m.content, isError: m.content === "…" } : m)));
          return;
        }
        const detail = "Agent returned an empty response.";
        setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, content: detail, isError: true } : m)));
        setDebugSteps((prev) => [...prev, { label: "Error", detail }]);
        notifyError(detail);
        return;
      }

      const nextConvId = done.conversationId ?? conversationId;
      if (nextConvId) { setConversationId(nextConvId); localStorage.setItem(STORAGE_KEY, nextConvId); }
      if (done.agentId && !selectedAgentId) setSelectedAgentId(done.agentId);
      setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, content: reply, id: undefined } : m)));
      setToolCalls(done.toolCalls ?? []);
      setLastTimings(done.timings ?? null);
      const clientMs = Math.round(performance.now() - clientStarted);
      const resolvedAgent = agents.find((a) => a.id === done.agentId)?.name ?? done.agentId ?? "unknown";
      setDebugSteps((prev) => [
        ...prev,
        { label: "Resolved Agent", detail: resolvedAgent },
        ...(done.timings ? [{ label: "Timings", detail: [done.timings.routingMs != null ? `routing=${done.timings.routingMs}ms` : null, done.timings.agentResolveMs != null ? `resolve=${done.timings.agentResolveMs}ms` : null, done.timings.llmTotalMs != null ? `llm+rag+tools=${done.timings.llmTotalMs}ms` : null, `serverTotal=${done.timings.totalMs}ms`, `clientTotal=${clientMs}ms`].filter(Boolean).join(" · ") }] : []),
        ...(st.ttfbs ? [{ label: "Streaming", detail: `firstToken=${st.ttfbs.firstStreamedToken}ms · full=${st.ttfbs.fullResponse}ms` }] : []),
        ...((done.toolCalls ?? []).length > 0 ? [{ label: `Tool Calls (${done.toolCalls!.length})`, detail: "Real tool executions returned by the runtime." }] : []),
        { label: "Final Response", detail: reply },
      ]);
    } catch (caught) {
      if (abort.signal.aborted) {
        setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, content: m.content === "…" ? "Stopped." : m.content, isError: m.content === "…" } : m)));
        return;
      }
      const detail = caught instanceof Error ? caught.message : "Could not reach the agent runtime.";
      setDebugSteps((prev) => [...prev, { label: "Error", detail }]);
      setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, content: detail, isError: true } : m)));
      notifyError(detail);
    } finally {
      if (abortRef.current === abort) abortRef.current = null;
      sendingRef.current = false;
      setSending(false);
    }
  }

  function stopSending() {
    abortRef.current?.abort();
  }

  // ── VOICE MODE CONTROLS ─────────────────────────────────────────────────
  const handleStartVoice = useCallback(() => {
    appendedTranscriptIdsRef.current.clear();
    voice.startConversation(selectedAgentId || null, conversationId);
  }, [voice, selectedAgentId, conversationId]);

  const handleStopVoice = useCallback(() => {
    voice.stopConversation();
  }, [voice]);

  // Voice status labels
  const voiceStatusLabel = (() => {
    switch (voice.status) {
      case ConversationStatus.Connecting: return "Connecting…";
      case ConversationStatus.Listening: return "Listening — speak now";
      case ConversationStatus.Thinking: return "Thinking…";
      case ConversationStatus.Speaking: return "HeySage is speaking…";
      case ConversationStatus.Error: return voice.errorMessage ?? "Error";
      case ConversationStatus.Disconnected: return "Disconnected";
      default: return "Ready";
    }
  })();

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const canSend = mode === "text" ? Boolean(input.trim()) && !sending && !resuming : false;
  const isVoiceActive = mode === "voice" && voice.status !== ConversationStatus.Idle && voice.status !== ConversationStatus.Disconnected && voice.status !== ConversationStatus.Error;

  return (
    <div className="flex w-full flex-col gap-6">
      <AiPageHeader
        title="Playground"
        description="Production chat through Parent/Router → permanent agent, with real RAG, tools, and persisted conversations. Text and Voice share the same conversation."
      />

      {/* ── Agent Selection ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Agent Selection</CardTitle>
            <CardDescription>
              Leave agent empty for automatic Parent/Router. Selecting an agent forces that permanent agent.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={startNewConversation} disabled={sending || isVoiceActive}>
            <RotateCcw className="mr-1.5 size-3.5" />
            New chat
          </Button>
        </CardHeader>
        <CardContent>
          {loadError && <p className="mb-3 text-sm text-destructive">{loadError}</p>}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <NativeSelect value={selectedCategoryId} onChange={(e) => handleCategoryChange(e.target.value)} aria-label="Select category" className="w-full" disabled={Boolean(conversationId)}>
                <option value="">All categories</option>
                {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </NativeSelect>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Agent</label>
              <NativeSelect value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} aria-label="Select agent" className="w-full" disabled={Boolean(conversationId)}>
                <option value="">Auto (Parent / Router)</option>
                {filteredAgents.map((a) => (<option key={a.id} value={a.id}>{a.name}{a.lifecycle_status !== "published" ? ` (${a.lifecycle_status})` : ""}</option>))}
              </NativeSelect>
            </div>
          </div>
          {conversationId && (
            <p className="mt-3 text-xs text-muted-foreground">
              Active conversation: {conversationId.slice(0, 8)}…
              {selectedAgent ? ` · Agent: ${selectedAgent.name}` : ""}
              {selectedCategory ? ` · Category: ${selectedCategory.name}` : ""}
              {isVoiceActive ? " · Voice active" : ""}. Start a new chat to change agent.
            </p>
          )}
          {selectedAgent && !conversationId && (
            <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium">{selectedAgent.name}</p>
              <p className="text-muted-foreground">{selectedAgent.description || "No description"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedCategory && `Category: ${selectedCategory.name} · `}
                Status: {selectedAgent.status} · Lifecycle: {selectedAgent.lifecycle_status}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Mode Tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-lg border bg-muted p-1 self-start">
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${mode === "text" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Text
        </button>
        <button
          type="button"
          onClick={() => setMode("voice")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${mode === "voice" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Voice
        </button>
      </div>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div className="grid h-[min(36rem,calc(100dvh-16rem))] gap-6 lg:grid-cols-[1fr_350px]">
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          <CardHeader className="shrink-0">
            <CardTitle>{mode === "text" ? "Chat" : "Voice"}</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* ── SHARED MESSAGE HISTORY ─────────────────────────────────── */}
            <div ref={listRef} className="mb-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain rounded-lg border p-4">
              {resuming ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Resuming conversation…</p>
                </div>
              ) : messages.length === 0 && !isVoiceActive ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">
                    {mode === "text"
                      ? "Send a message to start. Leave agent on Auto to exercise Parent/Router."
                      : "Press the microphone to start a voice conversation."}
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={msg.id ?? `${msg.role}-${i}`} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`flex max-w-[80%] items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        {msg.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                      </div>
                      <div className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                        msg.isError ? "border border-destructive/40 bg-destructive/10 text-destructive"
                          : msg.role === "user" ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                      }`}>
                        {msg.content}
                        {msg.source === "voice" && msg.role === "user" && (
                          <span className="ml-1.5 inline-block text-[10px] opacity-60">🎙️</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Text-mode thinking indicator */}
              {mode === "text" && sending && <p className="text-xs text-muted-foreground">Thinking…</p>}

              {/* ── VOICE LIVE TRANSCRIPTS (below shared history) ──────── */}
              {isVoiceActive && (
                <div className="mt-2 space-y-2 border-t pt-3">
                  {voice.transcripts.filter((t) => !t.isFinal).map((t) => (
                    <div key={t.id} className={`text-sm ${t.role === SpeakerRole.User ? "text-right text-muted-foreground" : "text-foreground"}`}>
                      <span className="text-xs opacity-50">{t.role === SpeakerRole.User ? "You" : "HeySage"}: </span>
                      <span className="italic">{t.text || "…"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── TEXT INPUT ──────────────────────────────────────────────── */}
            {mode === "text" && (
              <div className="flex shrink-0 gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message…"
                  disabled={sending || resuming}
                  rows={2}
                  className="min-h-0 resize-none"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                />
                <Button onClick={() => void handleSend()} disabled={!canSend} size="icon" aria-label="Send message">
                  <Send className="size-4" />
                </Button>
                {sending && (
                  <Button onClick={stopSending} variant="destructive" size="icon" aria-label="Stop streaming" title="Stop the streaming response">
                    <Square className="size-4" />
                  </Button>
                )}
              </div>
            )}

            {/* ── VOICE CONTROLS ─────────────────────────────────────────── */}
            {mode === "voice" && (
              <div className="flex shrink-0 flex-col items-center gap-4 py-4">
                <p className="text-sm text-muted-foreground">{voiceStatusLabel}</p>

                {!isVoiceActive ? (
                  <Button onClick={handleStartVoice} size="lg" className="h-16 w-16 rounded-full p-0">
                    <Mic className="size-6" />
                  </Button>
                ) : (
                  <Button onClick={handleStopVoice} variant="destructive" size="lg" className="h-16 w-16 rounded-full p-0">
                    <Square className="size-5" />
                  </Button>
                )}

                {voice.errorMessage && voice.status === ConversationStatus.Error && (
                  <p className="text-sm text-destructive">{voice.errorMessage}</p>
                )}

                {/* Agent resolved by voice */}
                {voice.activeAgent && (
                  <p className="text-xs text-muted-foreground">
                    Connected to: {voice.activeAgent.name}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Debug Panel ──────────────────────────────────────────────────── */}
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          <button type="button" onClick={() => setDebugOpen(!debugOpen)} className="flex w-full shrink-0 items-center justify-between p-4 text-left">
            <CardTitle className="text-sm">Debug Panel</CardTitle>
            {debugOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
          {debugOpen && (
            <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-0">
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

              {/* Voice session info */}
              {mode === "voice" && voice.sessionId && (
                <div className="mt-4 rounded-lg border p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Voice Session</p>
                  <p>Status: {voice.status}</p>
                  <p>Session: {voice.sessionId.slice(0, 8)}…</p>
                  <p>Agent: {voice.activeAgent?.name ?? "resolving…"}</p>
                  <p>Transcripts: {voice.transcripts.length} entries</p>
                </div>
              )}

              {lastTimings && (
                <div className="mt-4 rounded-lg border p-3 text-xs text-muted-foreground">
                  Server total: {lastTimings.totalMs}ms
                  {lastTimings.routingMs != null ? ` · routing ${lastTimings.routingMs}ms` : ""}
                  {lastTimings.llmTotalMs != null ? ` · llm/rag/tools ${lastTimings.llmTotalMs}ms` : ""}
                </div>
              )}

              {toolCalls.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Wrench className="size-3.5" />
                    Executed tools
                  </div>
                  <div className="space-y-3">
                    {toolCalls.map((call, i) => (
                      <div key={i} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{call.name}</p>
                          <span className={`text-xs font-medium ${call.status === "success" ? "text-emerald-600" : "text-destructive"}`}>{call.status}</span>
                        </div>
                        {call.status === "success" ? (
                          <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">{safeJson(call.result)}</pre>
                        ) : (
                          <p className="mt-2 text-xs text-destructive">{call.errorMessage ?? "Tool execution failed."}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {debugSteps.length > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed p-2 text-xs text-muted-foreground">
                  <Info className="size-3.5 shrink-0" />
                  <span>Production path: messages persist to ai_conversations / ai_messages; tool telemetry to ai_execution_logs.</span>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

function safeJson(value: unknown): string {
  if (value === undefined || value === null) return "null";
  if (typeof value === "string") { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } }
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}
