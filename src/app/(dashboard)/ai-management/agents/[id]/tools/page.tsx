"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Loader2,
  Plus,
  Puzzle,
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
import type { Agent } from "@/lib/agents/schema";
import type { AiTool } from "@/lib/ai-management/tools";
import { runtimeConfigFromConfiguration } from "@/lib/ai-management/agent-config";
import { notifyError, notifySuccess } from "@/lib/notify";

type RouteParams = Promise<{ id: string }>;

export default function AgentToolsPage({
  params,
}: {
  params: RouteParams;
}) {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [tools, setTools] = useState<AiTool[]>([]);
  const [assignedToolIds, setAssignedToolIds] = useState<string[]>([]);
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
        fetch("/api/ai-management/tools").then((r) => r.json()) as Promise<{
          tools?: AiTool[];
        }>,
      ])
        .then(([agentData, toolData]) => {
          if (!active) return;
          if (!agentData.agent) {
            setError(agentData.error ?? "Agent not found.");
            setLoading(false);
            return;
          }
          setAgent(agentData.agent);
          setTools(toolData.tools ?? []);
          const runtime = runtimeConfigFromConfiguration(
            agentData.agent.configuration,
          );
          setAssignedToolIds(runtime.tools);
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

  function toggleTool(id: string) {
    setAssignedToolIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  const assignedTools = tools.filter((t) => assignedToolIds.includes(t.id));
  const availableTools = tools.filter((t) => !assignedToolIds.includes(t.id));

  const filtered = tools.filter((tool) => {
    const isAssigned = assignedToolIds.includes(tool.id);
    const matchesFilter =
      filter === "all" ||
      (filter === "assigned" && isAssigned) ||
      (filter === "available" && !isAssigned);
    const matchesSearch = `${tool.name} ${tool.description}`
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
            tools: assignedToolIds,
          },
        }),
      });
      const data = (await response.json()) as {
        agent?: Agent;
        error?: string;
      };

      if (!response.ok) {
        notifyError(data.error ?? "Could not save tool configuration.");
        return;
      }

      if (data.agent) {
        setAgent(data.agent);
      }
      notifySuccess("Tool configuration saved successfully.");
    } catch {
      notifyError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <BackNav
          href={agentId ? `/ai-management/agents/${agentId}` : "/ai-management/agents"}
          label="Agent"
        />
        <AiPageHeader
          title="Tools"
          description="Loading..."
        />
        <AISkeleton />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <BackNav href="/ai-management/agents" label="Agents" />
        <AiPageHeader
          title="Tools"
          description="Error loading agent."
        />
        <AIErrorState title="Unable to load agent" description={error ?? "Agent not found."} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <BackNav href={`/ai-management/agents/${agent.id}`} label="Agent" />
      <AiPageHeader
        title={`${agent.name} — Tools`}
        description="Assign backend-managed tools to this agent. Tools provide capabilities like score lookups, data retrieval, and external API integrations."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Puzzle className="size-4 text-muted-foreground" />
            <CardTitle>Assigned Tools</CardTitle>
          </div>
          <CardDescription>
            Tools currently assigned to this agent. Click a tool to assign or
            remove it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tools.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
              <Puzzle className="size-4" />
              No tools available. Tools are registered and managed in the
              backend.
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative max-w-xs flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tools..."
                    className="pl-8"
                    aria-label="Search tools"
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
                        ? `All (${tools.length})`
                        : f === "assigned"
                          ? `Assigned (${assignedTools.length})`
                          : `Available (${availableTools.length})`}
                    </button>
                  ))}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  {filter === "assigned"
                    ? "No tools assigned to this agent."
                    : filter === "available"
                      ? "No available tools match your search."
                      : "No tools match your search."}
                </div>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {filtered.map((tool) => {
                    const isAssigned = assignedToolIds.includes(tool.id);
                    return (
                      <li
                        key={tool.id}
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
                              {tool.name}
                            </p>
                            <AIStatusBadge status={tool.status} />
                          </div>
                          <p className="ml-5.5 truncate text-sm text-muted-foreground">
                            {tool.description || "No description"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={isAssigned ? "outline" : "default"}
                          onClick={() => toggleTool(tool.id)}
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

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={pending || tools.length === 0}
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving...
            </>
          ) : (
            "Save Tool Configuration"
          )}
        </Button>
      </div>
    </div>
  );
}
