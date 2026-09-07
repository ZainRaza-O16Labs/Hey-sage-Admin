"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  BookOpen,
  Database,
  ListChecks,
  Puzzle,
  Search,
  Check,
  Plus,
  Mic,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AiMessageBanner } from "@/components/ai-management/ai-message-banner";
import { AIEmptyState } from "@/components/ai-management/ai-empty-state";
import { AIErrorState } from "@/components/ai-management/ai-error-state";
import { AIFormSkeleton } from "@/components/ai-management/ai-skeleton";
import { AIStatusBadge } from "@/components/ai-management/ai-status-badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Agent, AgentInput, FieldErrors } from "@/lib/agents/schema";
import type { AiCategory } from "@/lib/ai-management/store";
import type { AiTool } from "@/lib/ai-management/tools";
import type { AiKnowledgeBase } from "@/lib/ai-management/knowledge-bases";
import { fetchCategories } from "@/lib/ai-management/categories";
import { fetchTools } from "@/lib/ai-management/tools";
import { fetchKnowledgeBases } from "@/lib/ai-management/knowledge-bases";
import {
  AI_MODELS,
  defaultRuntimeConfig,
  runtimeConfigFromConfiguration,
  type AgentRuntimeConfig,
} from "@/lib/ai-management/agent-config";

type AgentFormProps = {
  mode: "create" | "edit";
  agent?: Agent;
};

type FormValue = {
  name: string;
  description: string;
  instructions: string;
  status: AgentInput["status"];
  lifecycle: AgentInput["lifecycle_status"];
  voiceId: string;
  voiceName: string;
  runtime: AgentRuntimeConfig;
};

const emptyForm: FormValue = {
  name: "",
  description: "",
  instructions: "",
  status: "active",
  lifecycle: "draft",
  voiceId: "",
  voiceName: "",
  runtime: defaultRuntimeConfig(),
};

export function AgentForm({ mode, agent }: AgentFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const agentId = agent?.id;

  const [form, setForm] = useState<FormValue>(() =>
    agent
      ? {
          name: agent.name,
          description: agent.description,
          instructions: agent.instructions,
          status: agent.status,
          lifecycle: agent.lifecycle_status,
          voiceId: agent.voice_id ?? "",
          voiceName: agent.voice_name ?? "",
          runtime: {
            ...runtimeConfigFromConfiguration(agent.configuration),
            category_id: agent.category_id ?? "",
          },
        }
      : emptyForm,
  );

  const [errors, setErrors] = useState<
    FieldErrors & {
      category?: string;
      temperature?: string;
      model?: string;
    }
  >({});

  const [categories, setCategories] = useState<AiCategory[] | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [tools, setTools] = useState<AiTool[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<AiKnowledgeBase[]>([]);

  const [toolSearch, setToolSearch] = useState("");
  const [toolView, setToolView] = useState<"assigned" | "available">(
    "assigned",
  );
  const [kbSearch, setKbSearch] = useState("");
  const [kbView, setKbView] = useState<"assigned" | "available">("assigned");

  const [pending, setPending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "ok"; detail: string }
    | { state: "error"; detail: string }
  >({ state: "idle" });

  async function handleValidateVoice() {
    if (!agentId || !form.voiceId.trim()) {
      setVoiceStatus({
        state: "error",
        detail: "Save the agent first, then add a voice id to validate it.",
      });
      return;
    }
    setVoiceStatus({ state: "checking" });
    try {
      const response = await fetch(
        `/api/ai-management/agents/${agentId}/voice/validate`,
        { method: "POST" },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        detail?: string;
        error?: string;
      };
      if (response.ok && payload.ok) {
        setVoiceStatus({ state: "ok", detail: "Voice exists on the ElevenLabs account." });
      } else {
        setVoiceStatus({
          state: "error",
          detail: payload.detail ?? payload.error ?? "Voice validation failed.",
        });
      }
    } catch {
      setVoiceStatus({ state: "error", detail: "Could not reach the validation endpoint." });
    }
  }

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const cats = await fetchCategories();
        if (active) setCategories(cats);
      } catch (err) {
        if (active) {
          setCategoriesError(
            err instanceof Error ? err.message : "Could not load categories.",
          );
        }
      }
      const [toolList, kbList] = await Promise.all([
        fetchTools().catch(() => [] as AiTool[]),
        fetchKnowledgeBases().catch(() => [] as AiKnowledgeBase[]),
      ]);
      if (active) {
        setTools(toolList);
        setKnowledgeBases(kbList);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  function updateRuntime(patch: Partial<AgentRuntimeConfig>) {
    setForm((current) => ({
      ...current,
      runtime: { ...current.runtime, ...patch },
    }));
  }

  function updateRag(patch: Partial<AgentRuntimeConfig["rag"]>) {
    setForm((current) => ({
      ...current,
      runtime: {
        ...current.runtime,
        rag: { ...current.runtime.rag, ...patch },
      },
    }));
  }

  function toggleTool(id: string) {
    const assigned = form.runtime.tools;
    const next = assigned.includes(id)
      ? assigned.filter((t) => t !== id)
      : [...assigned, id];
    updateRuntime({ tools: next });
  }

  function toggleKnowledgeBase(id: string) {
    const assigned = form.runtime.knowledge_base_ids;
    const next = assigned.includes(id)
      ? assigned.filter((k) => k !== id)
      : [...assigned, id];
    updateRuntime({ knowledge_base_ids: next });
  }

  const assignedTools = form.runtime.tools;
  const availableTools = tools.filter((tool) => !assignedTools.includes(tool.id));
  const filteredTools = tools.filter((tool) => {
    const matchesView =
      toolView === "assigned"
        ? assignedTools.includes(tool.id)
        : !assignedTools.includes(tool.id);
    const matchesSearch = `${tool.name} ${tool.description}`
      .toLowerCase()
      .includes(toolSearch.toLowerCase());
    return matchesView && matchesSearch;
  });

  const assignedKbs = form.runtime.knowledge_base_ids;
  const availableKbs = knowledgeBases.filter(
    (kb) => !assignedKbs.includes(kb.id),
  );
  const filteredKbs = knowledgeBases.filter((kb) => {
    const matchesView =
      kbView === "assigned" ? assignedKbs.includes(kb.id) : !assignedKbs.includes(kb.id);
    const matchesSearch = `${kb.name} ${kb.description}`
      .toLowerCase()
      .includes(kbSearch.toLowerCase());
    return matchesView && matchesSearch;
  });

  const selectedCategory = useMemo(
    () => categories?.find((category) => category.id === form.runtime.category_id) ?? null,
    [categories, form.runtime.category_id],
  );

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (!form.runtime.category_id) {
      next.category = "Category is required.";
    }
    if (!form.instructions.trim()) {
      next.instructions = "Instructions are required.";
    }
    const temp = Number(form.runtime.temperature);
    if (!Number.isFinite(temp) || temp < 0 || temp > 2) {
      next.temperature = "Temperature must be between 0 and 2.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setPending(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const payload: AgentInput = {
      name: form.name,
      description: form.description,
      instructions: form.instructions,
      status: form.status,
      lifecycle_status: form.lifecycle,
      category_id: form.runtime.category_id ? form.runtime.category_id : null,
      voice_id: form.voiceId.trim() || null,
      voice_name: form.voiceName.trim() || null,
      configuration: {
        ...(agent?.configuration ?? {}),
        ...{
          category_id: form.runtime.category_id,
          model: form.runtime.model,
          temperature: Number(form.runtime.temperature),
          tools: form.runtime.tools,
          knowledge_base_ids: form.runtime.knowledge_base_ids,
          rag: {
            enabled: form.runtime.rag.enabled,
            top_k: Number(form.runtime.rag.top_k),
            similarity_threshold: Number(form.runtime.rag.similarity_threshold),
          },
        },
      },
    };

    try {
      const response = await fetch(
        isEdit ? `/api/agents/${agentId}` : "/api/agents",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as {
        agent?: Agent;
        error?: string;
        errors?: FieldErrors;
      };

      if (!response.ok) {
        setErrors(data.errors ?? {});
        setErrorMessage(data.error ?? "Could not save agent.");
        return;
      }

      if (isEdit) {
        router.refresh();
        setSuccessMessage("Agent updated successfully.");
      } else if (data.agent) {
        router.push(`/ai-management/agents/${data.agent.id}`);
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  const canSave = !pending;
  const hasNoCategories = categories !== null && categories.length === 0;

  const categorySelect = (
    <div className="space-y-2">
      <Label htmlFor="category">Category</Label>
      {hasNoCategories ? (
        <div>
          <AIEmptyState
            title="No categories found"
            description="Create a category before creating an agent."
            actionHref="/ai-management/categories/new"
            actionLabel="Create Category"
          />
        </div>
      ) : (
        <NativeSelect
          id="category"
          name="category"
          value={form.runtime.category_id}
          onChange={(e) => updateRuntime({ category_id: e.target.value })}
          aria-invalid={Boolean(errors.category)}
          required
        >
          <option value="">Select a category</option>
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </NativeSelect>
      )}
      {errors.category && (
        <p className="text-sm text-destructive">{errors.category}</p>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <AiPageHeader
        title={isEdit ? "Edit Agent" : "Create Agent"}
        description={
          isEdit
            ? "Update this agent's category, instructions, tools and knowledge configuration."
            : "Create a permanent AI agent and configure its category, instructions, tools and knowledge."
        }
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={
                  isEdit && agentId
                    ? `/ai-management/agents/${agentId}`
                    : "/ai-management/agents"
                }
              />
            }
          >
            <ArrowLeft className="size-4" />
            Back to Agents
          </Button>
        }
      />

      {categoriesError ? (
        <AIErrorState
          title="Unable to load agent"
          description={categoriesError}
          onRetry={() => {
            setCategoriesError(null);
            setCategories(null);
            fetchCategories()
              .then(setCategories)
              .catch((err) =>
                setCategoriesError(
                  err instanceof Error ? err.message : "Could not load categories.",
                ),
              );
          }}
        />
      ) : categories === null ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-96 animate-pulse rounded bg-muted" />
          </div>
          <AIFormSkeleton />
        </div>
      ) : (
        <Card>
          <Tabs defaultValue="general" className="flex flex-col">
            <CardHeader className="border-b">
              <TabsList variant="line" className="justify-start">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="instructions">Instructions</TabsTrigger>
                <TabsTrigger value="tools">Tools</TabsTrigger>
                <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={onSubmit} className="flex flex-col gap-5">
                <TabsContent value="general" className="flex flex-col gap-5">
                  {categorySelect}

                  <div className="space-y-2">
                    <Label htmlFor="name">Agent Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={(e) =>
                        setForm((cur) => ({ ...cur, name: e.target.value }))
                      }
                      placeholder="e.g., Cricket"
                      aria-invalid={Boolean(errors.name)}
                      required
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      name="description"
                      value={form.description}
                      onChange={(e) =>
                        setForm((cur) => ({
                          ...cur,
                          description: e.target.value,
                        }))
                      }
                      placeholder="e.g., Cricket specialist for cricket-related questions"
                      aria-invalid={Boolean(errors.description)}
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive">
                        {errors.description}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <NativeSelect
                        id="model"
                        name="model"
                        value={form.runtime.model}
                        onChange={(e) =>
                          updateRuntime({ model: e.target.value })
                        }
                      >
                        {AI_MODELS.map((model) => (
                          <option key={model.value} value={model.value}>
                            {model.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="temperature">Temperature</Label>
                      <Input
                        id="temperature"
                        name="temperature"
                        type="number"
                        min={0}
                        max={2}
                        step={0.1}
                        value={form.runtime.temperature}
                        onChange={(e) =>
                          updateRuntime({
                            temperature: Number(e.target.value),
                          })
                        }
                        aria-invalid={Boolean(errors.temperature)}
                      />
                      {errors.temperature && (
                        <p className="text-sm text-destructive">
                          {errors.temperature}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="lifecycle">Lifecycle Status</Label>
                      <NativeSelect
                        id="lifecycle"
                        name="lifecycle"
                        value={form.lifecycle}
                        onChange={(e) =>
                          setForm((cur) => ({
                            ...cur,
                            lifecycle: e.target.value as FormValue["lifecycle"],
                          }))
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="unpublished">Unpublished</option>
                        <option value="published">Published</option>
                      </NativeSelect>
                      <p className="text-xs text-muted-foreground">
                        Published agents are eligible for production routing.
                        Draft and unpublished agents can be tested from the
                        Admin.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Operational Status</Label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={form.status === "active"}
                          onClick={() =>
                            setForm((cur) => ({
                              ...cur,
                              status:
                                cur.status === "active" ? "inactive" : "active",
                            }))
                          }
                          className="inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-input bg-muted px-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[checked=true]:bg-primary"
                          data-checked={form.status === "active"}
                        >
                          <span
                            className="size-5 rounded-full bg-background shadow transition-transform data-[checked=true]:translate-x-5"
                            data-checked={form.status === "active"}
                          />
                        </button>
                        <span className="text-sm font-medium capitalize">
                          {form.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Inactive agents do not route production traffic even
                        when published.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mic className="size-4 text-muted-foreground" />
                        <Label htmlFor="voice_id">Voice ID</Label>
                      </div>
                      <Input
                        id="voice_id"
                        name="voice_id"
                        value={form.voiceId}
                        onChange={(e) => {
                          setForm((cur) => ({ ...cur, voiceId: e.target.value }));
                          setVoiceStatus({ state: "idle" });
                        }}
                        placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
                        autoComplete="off"
                      />
                      <p className="text-xs text-muted-foreground">
                        ElevenLabs voice id. Validated against the account key
                        configured in Settings.
                      </p>
                      {voiceStatus.state === "ok" && (
                        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
                          <CheckCircle2 className="size-4" />
                          {voiceStatus.detail}
                        </p>
                      )}
                      {voiceStatus.state === "error" && (
                        <p className="flex items-center gap-1.5 text-sm text-destructive">
                          <XCircle className="size-4" />
                          {voiceStatus.detail}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="voice_name">Voice Name</Label>
                      <Input
                        id="voice_name"
                        name="voice_name"
                        value={form.voiceName}
                        onChange={(e) =>
                          setForm((cur) => ({ ...cur, voiceName: e.target.value }))
                        }
                        placeholder="Optional display name"
                      />
                      <div className="pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleValidateVoice()}
                          disabled={
                            voiceStatus.state === "checking" ||
                            !form.voiceId.trim()
                          }
                        >
                          {voiceStatus.state === "checking" ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-4" />
                          )}
                          Validate Voice
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="instructions" className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="instructions" className="text-base font-medium">
                      Instructions
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {form.instructions.length.toLocaleString()} / 50,000
                    </span>
                  </div>
                  <Textarea
                    id="instructions"
                    name="instructions"
                    value={form.instructions}
                    onChange={(e) =>
                      setForm((cur) => ({
                        ...cur,
                        instructions: e.target.value,
                      }))
                    }
                    placeholder={
                      "You are a {specialist}.\n\nAnswer questions about players, matches, scores and statistics...\n\nAdd guidelines for tone, scope and format here."
                    }
                    aria-invalid={Boolean(errors.instructions)}
                    rows={20}
                    className="min-h-96 font-mono text-sm leading-relaxed"
                  />
                  {errors.instructions ? (
                    <p className="text-sm text-destructive">
                      {errors.instructions}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Manual instructions are the source of truth for this
                      agent&apos;s behavior.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="tools" className="flex flex-col gap-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Puzzle className="size-4 text-muted-foreground" />
                        <CardTitle>Assigned Tools</CardTitle>
                      </div>
                      <CardDescription>
                        Tools currently assigned to this agent.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {tools.length === 0 ? (
                        <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
                          <ListChecks className="size-4" />
                          No tools available. Tools are registered and managed
                          in the backend.
                        </div>
                      ) : (
                        <>
                          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="relative max-w-xs flex-1">
                              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                value={toolSearch}
                                onChange={(e) => setToolSearch(e.target.value)}
                                placeholder="Search tools..."
                                className="pl-8"
                                aria-label="Search tools"
                              />
                            </div>
                            <div className="flex gap-1 rounded-lg bg-muted p-0.5">
                              <button
                                type="button"
                                onClick={() => setToolView("assigned")}
                                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                                  toolView === "assigned"
                                    ? "bg-background shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                Assigned ({assignedTools.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setToolView("available")}
                                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                                  toolView === "available"
                                    ? "bg-background shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                Available ({availableTools.length})
                              </button>
                            </div>
                          </div>

                          {filteredTools.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                              {toolView === "assigned"
                                ? "No tools assigned to this agent."
                                : "No available tools match your search."}
                            </div>
                          ) : (
                            <ul className="divide-y rounded-lg border">
                              {filteredTools.map((tool) => (
                                <li
                                  key={tool.id}
                                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="truncate text-sm font-medium">
                                        {tool.name}
                                      </p>
                                      <AIStatusBadge status={tool.status} />
                                    </div>
                                    <p className="truncate text-sm text-muted-foreground">
                                      {tool.description}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={
                                      toolView === "assigned"
                                        ? "outline"
                                        : "default"
                                    }
                                    onClick={() => toggleTool(tool.id)}
                                  >
                                    {toolView === "assigned" ? (
                                      <>
                                        <Check className="size-3.5" /> Remove
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="size-3.5" /> Assign
                                      </>
                                    )}
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="knowledge" className="flex flex-col gap-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Database className="size-4 text-muted-foreground" />
                        <CardTitle>Knowledge Bases</CardTitle>
                      </div>
                      <CardDescription>
                        Knowledge bases used for retrieval by this agent.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {knowledgeBases.length === 0 ? (
                        <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
                          <BookOpen className="size-4" />
                          No Knowledge Bases available.
                        </div>
                      ) : (
                        <>
                          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="relative max-w-xs flex-1">
                              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                value={kbSearch}
                                onChange={(e) => setKbSearch(e.target.value)}
                                placeholder="Search knowledge bases..."
                                className="pl-8"
                                aria-label="Search knowledge bases"
                              />
                            </div>
                            <div className="flex gap-1 rounded-lg bg-muted p-0.5">
                              <button
                                type="button"
                                onClick={() => setKbView("assigned")}
                                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                                  kbView === "assigned"
                                    ? "bg-background shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                Assigned ({assignedKbs.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setKbView("available")}
                                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                                  kbView === "available"
                                    ? "bg-background shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                Available ({availableKbs.length})
                              </button>
                            </div>
                          </div>

                          {filteredKbs.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                              {kbView === "assigned"
                                ? "No knowledge bases assigned to this agent."
                                : "No available knowledge bases match your search."}
                            </div>
                          ) : (
                            <ul className="divide-y rounded-lg border">
                              {filteredKbs.map((kb) => (
                                <li
                                  key={kb.id}
                                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="truncate text-sm font-medium">
                                        {kb.name}
                                      </p>
                                      <AIStatusBadge status={kb.status} />
                                    </div>
                                    <p className="truncate text-sm text-muted-foreground">
                                      {kb.description}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={
                                      kbView === "assigned"
                                        ? "outline"
                                        : "default"
                                    }
                                    onClick={() => toggleKnowledgeBase(kb.id)}
                                  >
                                    {kbView === "assigned" ? (
                                      <>
                                        <Check className="size-3.5" /> Remove
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="size-3.5" /> Assign
                                      </>
                                    )}
                                  </Button>
                                </li>
                              ))}
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
                        Retrieval settings for this agent.
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
                          aria-checked={form.runtime.rag.enabled}
                          onClick={() =>
                            updateRag({ enabled: !form.runtime.rag.enabled })
                          }
                          className="inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-input bg-muted px-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[checked=true]:bg-primary"
                          data-checked={form.runtime.rag.enabled}
                        >
                          <span
                            className="size-5 rounded-full bg-background shadow transition-transform data-[checked=true]:translate-x-5"
                            data-checked={form.runtime.rag.enabled}
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
                            value={form.runtime.rag.top_k}
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
                            value={form.runtime.rag.similarity_threshold}
                            onChange={(e) =>
                              updateRag({
                                similarity_threshold: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Retrieval only uses knowledge bases assigned to this
                        agent.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="preview" className="flex flex-col gap-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Bot className="size-4 text-muted-foreground" />
                        <CardTitle>Agent Configuration</CardTitle>
                      </div>
                      <CardDescription>
                        Review the configured agent before saving.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Category
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {selectedCategory?.name ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Agent Name
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {form.name || "—"}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Description
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {form.description || "No description"}
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Instructions
                        </p>
                        {form.instructions ? (
                          <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                            {form.instructions}
                          </pre>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">
                            No instructions configured.
                          </p>
                        )}
                      </div>
                      <Separator />
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Model
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {AI_MODELS.find(
                              (m) => m.value === form.runtime.model,
                            )?.label ?? form.runtime.model}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Temperature
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {form.runtime.temperature}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Status
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <AIStatusBadge status={form.lifecycle} />
                            <AIStatusBadge status={form.status} />
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Tools
                          </p>
                          <div className="mt-1">
                            <Badge variant="secondary">
                              {assignedTools.length} Tools
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Knowledge Bases
                          </p>
                          <div className="mt-1">
                            <Badge variant="secondary">
                              {assignedKbs.length} Knowledge Bases
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            RAG
                          </p>
                          <div className="mt-1">
                            <Badge variant={form.runtime.rag.enabled ? "default" : "secondary"}>
                              {form.runtime.rag.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {successMessage && (
                  <AiMessageBanner
                    kind="success"
                    onDismiss={() => setSuccessMessage(null)}
                  >
                    {successMessage}
                  </AiMessageBanner>
                )}
                {errorMessage && (
                  <AiMessageBanner
                    kind="error"
                    onDismiss={() => setErrorMessage(null)}
                  >
                    {errorMessage}
                  </AiMessageBanner>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t pt-5">
                  <Button type="submit" disabled={!canSave}>
                    {pending
                      ? isEdit
                        ? "Saving..."
                        : "Creating..."
                      : isEdit
                        ? "Save Changes"
                        : "Create Agent"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    nativeButton={false}
                    render={
                      <Link
                        href={
                          isEdit && agentId
                            ? `/ai-management/agents/${agentId}`
                            : "/ai-management/agents"
                        }
                      />
                    }
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Tabs>
        </Card>
      )}
    </div>
  );
}
