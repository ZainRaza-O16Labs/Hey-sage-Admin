"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Database,
  ListChecks,
  Loader2,
  Mic,
  Plus,
  Puzzle,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AiMessageBanner } from "@/components/ai-management/ai-message-banner";
import { AIEmptyState } from "@/components/ai-management/ai-empty-state";
import { AIErrorState } from "@/components/ai-management/ai-error-state";
import { AIFormSkeleton } from "@/components/ai-management/ai-skeleton";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";

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

type VoiceErrorCode = "invalid" | "key_missing" | "api_error";

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

const STEPS = [
  "General",
  "Instructions",
  "Model & Voice",
  "Tools",
  "Knowledge Base",
] as const;

const STEP_COUNT = STEPS.length;

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

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<ReadonlySet<number>>(
    new Set(),
  );
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [currentStep]);

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
    | { state: "ok"; voiceId: string }
    | { state: "error"; code: VoiceErrorCode; detail: string }
  >({ state: "idle" });
  const voiceInputRef = useRef(form.voiceId);

  useEffect(() => {
    voiceInputRef.current = form.voiceId;
  }, [form.voiceId]);

  const isVoiceVerified =
    voiceStatus.state === "ok" &&
    form.voiceId.trim() !== "" &&
    voiceStatus.voiceId === form.voiceId.trim();

  async function handleValidateVoice() {
    const voiceId = form.voiceId.trim();
    if (!voiceId) return;
    if (voiceStatus.state === "checking") return;
    setVoiceStatus({ state: "checking" });
    try {
      const response = await fetch("/api/ai-management/voices/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        code?: VoiceErrorCode;
        detail?: string;
        voiceId?: string;
      } | null;
      const stillCurrent = voiceId === voiceInputRef.current.trim();
      if (response.ok && payload?.ok && payload.voiceId === voiceId && stillCurrent) {
        setVoiceStatus({ state: "ok", voiceId });
      } else {
        setVoiceStatus({
          state: "error",
          code: payload?.code ?? "invalid",
          detail: payload?.detail ?? "Voice ID could not be verified.",
        });
      }
    } catch {
      setVoiceStatus({
        state: "error",
        code: "api_error",
        detail: "Could not reach the validation endpoint. Please try again.",
      });
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

  function validateStep(step: number): boolean {
    const next: typeof errors = {};
    if (step === 1) {
      if (!form.name.trim()) next.name = "Name is required.";
      if (!form.runtime.category_id) {
        next.category = "Category is required.";
      }
    } else if (step === 2) {
      if (!form.instructions.trim()) {
        next.instructions = "Instructions are required.";
      }
    } else if (step === 3) {
      const temp = Number(form.runtime.temperature);
      if (!Number.isFinite(temp) || temp < 0 || temp > 2) {
        next.temperature = "Temperature must be between 0 and 2.";
      }
      if (!form.voiceId.trim()) {
        next.voice_id = "Voice ID is required.";
      } else if (!isVoiceVerified) {
        next.voice_id = "Voice ID must be verified before continuing.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleNext() {
    if (currentStep >= STEP_COUNT) return;
    if (!validateStep(currentStep)) return;
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(currentStep);
      return next;
    });
    setCurrentStep((step) => step + 1);
  }

  function handlePrevious() {
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  function goToStep(step: number) {
    if (step === currentStep) return;
    if (step > currentStep && step > 3 && !isVoiceVerified) {
      setErrors((cur) => ({
        ...cur,
        voice_id: "Verify the Voice ID before moving to the next step.",
      }));
      return;
    }
    const completed = step < currentStep || completedSteps.has(step);
    if (!completed) return;
    setCurrentStep(step);
  }

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
    if (!form.voiceId.trim()) {
      next.voice_id = "Voice ID is required.";
    } else if (!isVoiceVerified) {
      next.voice_id = "Voice ID must be verified before saving.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentStep < STEP_COUNT) return;
    if (!isVoiceVerified) {
      setCurrentStep(3);
      setErrors((cur) => ({
        ...cur,
        voice_id: "Verify the Voice ID before saving.",
      }));
      return;
    }
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

  const canSave = !pending && isVoiceVerified;
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

  const generalFields = (
    <>
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
    </>
  );

  const modelAndVoiceFields = (
    <>
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
          <div className="flex items-center gap-2">
            <Mic className="size-4 text-muted-foreground" />
            <Label htmlFor="voice_id">Voice ID</Label>
          </div>
          <div className="flex items-center gap-2">
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
              aria-invalid={Boolean(errors.voice_id)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleValidateVoice()}
              disabled={
                voiceStatus.state === "checking" || !form.voiceId.trim()
              }
              className="shrink-0"
            >
              {voiceStatus.state === "checking" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isVoiceVerified ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              {voiceStatus.state === "checking"
                ? "Verifying..."
                : isVoiceVerified
                  ? "Verified"
                  : "Verify Voice ID"}
            </Button>
          </div>
          {voiceStatus.state === "ok" && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="size-4" />
              Voice ID Verified
            </p>
          )}
          {voiceStatus.state === "error" && (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <XCircle className="size-4" />
              {voiceStatus.detail}
            </p>
          )}
          {voiceStatus.state === "checking" && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Verifying Voice ID against ElevenLabs...
            </p>
          )}
          {voiceStatus.state === "idle" &&
            !errors.voice_id &&
            form.voiceId.trim() !== "" && (
              <p className="text-xs text-muted-foreground">
                Click &quot;Verify Voice ID&quot; so the ID is validated
                against ElevenLabs before continuing.
              </p>
            )}
          {errors.voice_id && (
            <p className="text-sm text-destructive">
              {errors.voice_id}
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
        </div>
      </div>
    </>
  );

  const instructionsFields = (
    <div className="flex flex-col gap-2">
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
    </div>
  );

  const toolsFields = (
    <div className="flex flex-col gap-4">
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
    </div>
  );

  const knowledgeBaseFields = (
    <div className="flex flex-col gap-4">
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
    </div>
  );

  const stepContent = [
    generalFields,
    instructionsFields,
    modelAndVoiceFields,
    toolsFields,
    knowledgeBaseFields,
  ];

  const isLastStep = currentStep === STEP_COUNT;
  const submitLabel = pending
    ? isEdit
      ? "Saving..."
      : "Creating..."
    : isEdit
      ? "Save Changes"
      : "Create Agent";

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
          <CardHeader className="border-b">
            <nav aria-label="Agent setup steps" className="-mx-1 overflow-x-auto px-1 pb-1">
              <ol className="flex min-w-max items-center gap-2">
                {STEPS.map((label, index) => {
                  const step = index + 1;
                  const isCurrent = currentStep === step;
                  const isCompleted =
                    completedSteps.has(step) || step < currentStep;
                  return (
                    <li key={label} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => goToStep(step)}
                        disabled={!isCompleted && !isCurrent}
                        aria-current={isCurrent ? "step" : undefined}
                        aria-label={`Step ${step} of ${STEP_COUNT}: ${label}${isCompleted ? " (completed)" : ""}${isCurrent ? " (current)" : ""}`}
                        className={cn(
                          "group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                          isCurrent
                            ? "border-primary bg-primary text-primary-foreground"
                            : isCompleted
                              ? "border-border bg-background text-foreground hover:bg-muted"
                              : "cursor-not-allowed border-border bg-muted text-muted-foreground/60 disabled:pointer-events-none disabled:opacity-60",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full text-xs font-semibold",
                            isCurrent
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : isCompleted
                                ? "bg-primary/10 text-primary"
                                : "bg-background text-muted-foreground",
                          )}
                        >
                          {isCompleted ? <Check className="size-3.5" /> : step}
                        </span>
                        <span className="whitespace-nowrap">{label}</span>
                      </button>
                      {step < STEP_COUNT && (
                        <span className="h-px w-8 bg-border" aria-hidden="true" />
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={onSubmit} className="flex flex-col gap-5">
              <h2
                ref={stepHeadingRef}
                tabIndex={-1}
                className="text-base font-semibold outline-none"
              >
                Step {currentStep} of {STEP_COUNT}: {STEPS[currentStep - 1]}
              </h2>

              {stepContent[currentStep - 1]}

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

              <div className="flex items-center justify-between gap-2 border-t pt-5">
                <div>
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={pending}
                    >
                      <ArrowLeft className="size-4" />
                      Previous
                    </Button>
                  )}
                </div>
                <div>
                  {!isLastStep ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={pending || (currentStep === 3 && !isVoiceVerified)}
                    >
                      Next
                      <ArrowRight className="size-4" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={!canSave}>
                      {submitLabel}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}