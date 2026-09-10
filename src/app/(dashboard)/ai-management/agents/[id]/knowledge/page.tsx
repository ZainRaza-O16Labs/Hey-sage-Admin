"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Database,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { BackNav } from "@/components/ai-management/back-nav";
import { AIErrorState } from "@/components/ai-management/ai-error-state";
import { AISkeleton } from "@/components/ai-management/ai-skeleton";
import { AIStatusBadge } from "@/components/ai-management/ai-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Agent } from "@/lib/agents/schema";
import type { AiKnowledgeBase } from "@/lib/ai-management/knowledge-bases";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  runtimeConfigFromConfiguration,
  type AgentRuntimeConfig,
} from "@/lib/ai-management/agent-config";

type RouteParams = Promise<{ id: string }>;

export default function AgentKnowledgePage({
  params,
}: {
  params: RouteParams;
}) {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<AiKnowledgeBase[]>([]);
  const [assignedKbIds, setAssignedKbIds] = useState<string[]>([]);
  const [rag, setRag] = useState<AgentRuntimeConfig["rag"]>({
    enabled: false,
    top_k: 3,
    similarity_threshold: 0.5,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "assigned" | "available">("all");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    params.then(({ id }) => {
      if (!active) return;
      setAgentId(id);

      Promise.all([
        fetch(`/api/agents/${id}`).then((r) => r.json()) as Promise<{
          agent?: Agent;
          error?: string;
        }>,
        fetch("/api/ai-management/knowledge-bases").then((r) =>
          r.json(),
        ) as Promise<{ knowledgeBases?: AiKnowledgeBase[] }>,
      ])
        .then(([agentData, kbData]) => {
          if (!active) return;
          if (!agentData.agent) {
            setError(agentData.error ?? "Agent not found.");
            setLoading(false);
            return;
          }
          setAgent(agentData.agent);
          setKnowledgeBases(kbData.knowledgeBases ?? []);
          const runtime = runtimeConfigFromConfiguration(
            agentData.agent.configuration,
          );
          setAssignedKbIds(runtime.knowledge_base_ids);
          setRag(runtime.rag);
          setLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setError("Could not load agent data.");
          setLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [params]);

  function toggleKnowledgeBase(id: string) {
    setAssignedKbIds((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    );
  }

  function updateRag(patch: Partial<AgentRuntimeConfig["rag"]>) {
    setRag((prev) => ({ ...prev, ...patch }));
  }

  const assignedKbs = knowledgeBases.filter((kb) => assignedKbIds.includes(kb.id));
  const availableKbs = knowledgeBases.filter(
    (kb) => !assignedKbIds.includes(kb.id),
  );

  const filtered = knowledgeBases.filter((kb) => {
    const isAssigned = assignedKbIds.includes(kb.id);
    const matchesFilter =
      filter === "all" ||
      (filter === "assigned" && isAssigned) ||
      (filter === "available" && !isAssigned);
    const matchesSearch = `${kb.name} ${kb.description}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  async function handleSave() {
    if (!agentId || !agent) return;
    setPending(true);

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configuration: {
            ...agent.configuration,
            knowledge_base_ids: assignedKbIds,
            rag: {
              enabled: rag.enabled,
              top_k: Number(rag.top_k),
              similarity_threshold: Number(rag.similarity_threshold),
            },
          },
        }),
      });
      const data = (await response.json()) as {
        agent?: Agent;
        error?: string;
      };

      if (!response.ok) {
        notifyError(data.error ?? "Could not save knowledge configuration.");
        return;
      }

      if (data.agent) {
        setAgent(data.agent);
      }
      notifySuccess("Knowledge configuration saved successfully.");
    } catch {
      notifyError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <BackNav
          href={agentId ? `/ai-management/agents/${agentId}` : "/ai-management/agents"}
          label="Agent"
        />
        <AiPageHeader
          title="Knowledge"
          description="Loading..."
        />
        <AISkeleton />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex w-full flex-col gap-6">
        <BackNav href="/ai-management/agents" label="Agents" />
        <AiPageHeader
          title="Knowledge"
          description="Error loading agent."
        />
        <AIErrorState
          title="Unable to load agent"
          description={error ?? "Agent not found."}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <BackNav href={`/ai-management/agents/${agent.id}`} label="Agent" />
      <AiPageHeader
        title={`${agent.name} — Knowledge`}
        description="Assign knowledge bases and configure retrieval-augmented generation settings for this agent."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="size-4 text-muted-foreground" />
            <CardTitle>Assigned Knowledge Bases</CardTitle>
          </div>
          <CardDescription>
            Knowledge bases currently connected to this agent. Click a knowledge
            base to assign or remove it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {knowledgeBases.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
              <Database className="size-4" />
              No knowledge bases available. Create one in Knowledge Base
              Management.
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative max-w-xs flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search knowledge bases..."
                    className="pl-8"
                    aria-label="Search knowledge bases"
                  />
                </div>
                <div className="flex gap-1 rounded-lg bg-muted p-0.5">
                  {(["all", "assigned", "available"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                        filter === f
                          ? "bg-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f === "all"
                        ? `All (${knowledgeBases.length})`
                        : f === "assigned"
                          ? `Assigned (${assignedKbs.length})`
                          : `Available (${availableKbs.length})`}
                    </button>
                  ))}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  {filter === "assigned"
                    ? "No knowledge bases assigned to this agent."
                    : filter === "available"
                      ? "No available knowledge bases match your search."
                      : "No knowledge bases match your search."}
                </div>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {filtered.map((kb) => {
                    const isAssigned = assignedKbIds.includes(kb.id);
                    return (
                      <li
                        key={kb.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {isAssigned ? (
                              <Check className="size-3.5 shrink-0 text-emerald-600" />
                            ) : (
                              <span className="size-3.5 shrink-0 rounded-full border border-dashed" />
                            )}
                            <p className="truncate text-sm font-medium">
                              {kb.name}
                            </p>
                            <AIStatusBadge status={kb.status} />
                          </div>
                          <p className="ml-5.5 truncate text-sm text-muted-foreground">
                            {kb.description || "No description"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={isAssigned ? "outline" : "default"}
                          onClick={() => toggleKnowledgeBase(kb.id)}
                        >
                          {isAssigned ? (
                            <>
                              <X className="size-3.5" /> Remove
                            </>
                          ) : (
                            <>
                              <Plus className="size-3.5" /> Assign
                            </>
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RAG Configuration</CardTitle>
          <CardDescription>
            Retrieval-augmented generation settings for this agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable RAG</p>
              <p className="text-xs text-muted-foreground">
                Use assigned knowledge bases for retrieval.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={rag.enabled}
              onClick={() => updateRag({ enabled: !rag.enabled })}
              className="inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-input bg-muted px-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[checked=true]:bg-primary"
              data-checked={rag.enabled}
            >
              <span
                className="size-5 rounded-full bg-background shadow transition-transform data-[checked=true]:translate-x-5"
                data-checked={rag.enabled}
              />
            </button>
          </div>

          <Separator />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="topK">Top K</Label>
              <Input
                id="topK"
                name="topK"
                type="number"
                min={1}
                max={20}
                value={rag.top_k}
                onChange={(e) =>
                  updateRag({ top_k: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="similarity">Similarity Threshold</Label>
              <Input
                id="similarity"
                name="similarity"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={rag.similarity_threshold}
                onChange={(e) =>
                  updateRag({
                    similarity_threshold: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Retrieval only uses knowledge bases assigned to this agent.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving...
            </>
          ) : (
            "Save Knowledge Configuration"
          )}
        </Button>
      </div>
    </div>
  );
}
