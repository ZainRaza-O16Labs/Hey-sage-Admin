"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Info,
  Cpu,
  PenLine,
  ChevronLeft,
  ChevronRight,
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
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

type AgentErrors = FieldErrors & {
  category?: string;
  temperature?: string;
  model?: string;
};

const STEPS: {
  id: "general" | "instructions" | "model-voice" | "tools" | "knowledge" | "review";
  title: string;
  description: string;
  icon: typeof Info;
}[] = [
  { id: "general", title: "General", description: "Category, name and description", icon: Info },
  { id: "instructions", title: "Instructions", description: "Define agent behavior", icon: BookOpen },
  { id: "model-voice", title: "Model & Voice", description: "Runtime model and TTS voice", icon: Cpu },
  { id: "tools", title: "Tools", description: "Assign available tools", icon: Puzzle },
  { id: "knowledge", title: "Knowledge Base", description: "Attach knowledge and RAG", icon: Database },
  { id: "review", title: "Review", description: "Confirm before saving", icon: CheckCircle2 },
];

export function AgentForm({ mode, agent }: AgentFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const agentId = agent?.id;

  const [stepIndex, setStepIndex] = useState(0);

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

  const [errors, setErrors] = useState<AgentErrors>({});

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

  const nameRef = useRef<HTMLInputElement | null>(null);
  const categoryRef = useRef<HTMLSelectElement | null>(null);
  const instructionsRef = useRef<HTMLTextAreaElement | null>(null);
  const temperatureRef = useRef<HTMLInputElement | null>(null);

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

  function validateStepRules(
    step: number,
  ): Partial<Record<keyof AgentErrors, string | undefined>> {
    const rules: Partial<Record<keyof AgentErrors, string | undefined>> = {};
    if (step === 0) {
      if (!form.runtime.category_id) {
        rules.category = "Category is required.";
      }
      if (!form.name.trim()) {
        rules.name = "Name is required.";
      }
    } else if (step === 1) {
      if (!form.instructions.trim()) {
        rules.instructions = "Instructions are required.";
      }
    } else if (step === 2) {
      const temp = Number(form.runtime.temperature);
      if (!Number.isFinite(temp) || temp < 0 || temp > 2) {
        rules.temperature = "Temperature must be between 0 and 2.";
      }
    }
    return rules;
  }

  function mergeErrors(rules: Partial<Record<keyof AgentErrors, string | undefined>>) {
    const keys = Object.keys(rules) as (keyof AgentErrors)[];
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        if (rules[key]) next[key] = rules[key] as string;
        else delete next[key];
      }
      return next;
    });
    return keys.every((key) => !rules[key]);
  }

  function isValidStep(step: number): boolean {
    const rules = validateStepRules(step);
    return Object.values(rules).every((value) => !value);
  }

  function focusStepField(step: number) {
    const refs: Partial<Record<number, React.RefObject<HTMLElement | null>>> = {
      0: nameRef,
      1: instructionsRef,
      2: temperatureRef,
    };
    const target = refs[step]?.current;
    if (target) target.focus();
  }

  function handleNext() {
    if (!isValidStep(stepIndex)) {
      mergeErrors(validateStepRules(stepIndex));
      return;
    }
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  }

  function handleBack() {
    setStepIndex((index) => Math.max(index - 1, 0));
  }

  function handleJump(index: number) {
    if (index < stepIndex) {
      setStepIndex(index);
    }
  }

  function validateAll(): number {
    let firstInvalid = -1;
    for (let i = 0; i < STEPS.length; i++) {
      if (!isValidStep(i)) {
        firstInvalid = firstInvalid === -1 ? i : firstInvalid;
      }
    }
    const allRules: Partial<Record<keyof AgentErrors, string | undefined>> = {};
    for (let i = 0; i < STEPS.length; i++) {
      Object.assign(allRules, validateStepRules(i));
    }
    mergeErrors(allRules);
    return firstInvalid;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstInvalid = validateAll();
    if (firstInvalid !== -1) {
      setStepIndex(firstInvalid);
      focusStepField(firstInvalid);
      return;
    }

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
        setErrors((prev) => ({ ...prev, ...(data.errors ?? {}) }));
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

  const selectedModel = useMemo(
    () => AI_MODELS.find((m) => m.value === form.runtime.model)?.label ?? form.runtime.model,
    [form.runtime.model],
  );

  const isLastStep = stepIndex === STEPS.length - 1;
  const isFirstStep = stepIndex === 0;

  const categorySelect = (
    <div className="space-y-2">
      <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
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
          ref={categoryRef}
          value={form.runtime.category_id}
          onChange={(e) => {
            updateRuntime({ category_id: e.target.value });
            if (errors.category && e.target.value) {
              setErrors((prev) => ({ ...prev, category: undefined }));
            }
          }}
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
        <p className="text-sm text-destructive" role="alert">
          {errors.category}
        </p>
      )}
    </div>
  );

  function renderGeneral() {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid gap-5 md:grid-cols-2">
          {categorySelect}

          <div className="space-y-2">
            <Label htmlFor="name">Agent Name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              name="name"
              ref={nameRef as React.Ref<HTMLInputElement>}
              value={form.name}
              onChange={(e) => {
                setForm((cur) => ({ ...cur, name: e.target.value }));
                if (errors.name && e.target.value.trim()) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              placeholder="e.g., Cricket"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              required
            />
            {errors.name && (
              <p id="name-error" className="text-sm text-destructive" role="alert">
                {errors.name}
              </p>
            )}
          </div>
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
          <p className="text-xs text-muted-foreground">
            A short summary shown in lists and when this agent is selected.
          </p>
          {errors.description && (
            <p className="text-sm text-destructive" role="alert">
              {errors.description}
            </p>
          )}
        </div>

        <Separator />

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
              Published agents are eligible for production routing. Draft and
              unpublished agents can be tested from the Admin.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Operational Status</Label>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                role="switch"
                aria-checked={form.status === "active"}
                aria-label="Operational status"
                onClick={() =>
                  setForm((cur) => ({
                    ...cur,
                    status: cur.status === "active" ? "inactive" : "active",
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium capitalize">{form.status}</span>
                <AIStatusBadge status={form.status} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Inactive agents do not route production traffic even when published.
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <Bot className="size-3.5" />
            Current lifecycle
          </div>
          <AIStatusBadge status={form.lifecycle} />
          <span className="ml-2">
            {form.lifecycle === "draft"
              ? "Saved as a draft — not yet published to production routing."
              : form.lifecycle === "unpublished"
                ? "Configured but not eligible for production routing."
                : "Eligible for production routing."}
          </span>
        </div>
      </div>
    );
  }

  function renderInstructions() {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="instructions" className="text-base font-medium">
            Instructions <span className="text-destructive">*</span>
          </Label>
          <span className="text-xs text-muted-foreground">
            {form.instructions.length.toLocaleString()} / 50,000
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Describe how this agent should behave — its role, tone, scope and
          format. These instructions are the source of truth for how the agent
          responds.
        </p>
        <Textarea
          id="instructions"
          name="instructions"
          ref={instructionsRef as React.Ref<HTMLTextAreaElement>}
          value={form.instructions}
          onChange={(e) => {
            setForm((cur) => ({
              ...cur,
              instructions: e.target.value,
            }));
            if (errors.instructions && e.target.value.trim()) {
              setErrors((prev) => ({ ...prev, instructions: undefined }));
            }
          }}
          placeholder={
            "You are a {specialist}.\n\nAnswer questions about players, matches, scores and statistics...\n\nAdd guidelines for tone, scope and format here."
          }
          aria-invalid={Boolean(errors.instructions)}
          aria-describedby={errors.instructions ? "instructions-error" : undefined}
          rows={16}
          className="min-h-80 text-sm leading-relaxed"
        />
        {errors.instructions ? (
          <p id="instructions-error" className="text-sm text-destructive" role="alert">
            {errors.instructions}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Manual instructions are the source of truth for this agent&apos;s
            behavior.
          </p>
        )}
      </div>
    );
  }

  function renderModelVoice() {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <NativeSelect
              id="model"
              name="model"
              value={form.runtime.model}
              onChange={(e) => updateRuntime({ model: e.target.value })}
            >
              {AI_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">
              The language model used for this agent&apos;s responses.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              name="temperature"
              ref={temperatureRef as React.Ref<HTMLInputElement>}
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={form.runtime.temperature}
              onChange={(e) => {
                updateRuntime({ temperature: Number(e.target.value) });
                const value = Number(e.target.value);
                if (errors.temperature && Number.isFinite(value) && value >= 0 && value <= 2) {
                  setErrors((prev) => ({ ...prev, temperature: undefined }));
                }
              }}
              aria-invalid={Boolean(errors.temperature)}
              aria-describedby={errors.temperature ? "temperature-error" : undefined}
            />
            <p className="text-xs text-muted-foreground">
              Controls randomness. Lower is more focused; higher is more varied.
            </p>
            {errors.temperature && (
              <p id="temperature-error" className="text-sm text-destructive" role="alert">
                {errors.temperature}
              </p>
            )}
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-2">
          <Mic className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">ElevenLabs Voice</p>
        </div>
        <p className="-mt-3 text-xs text-muted-foreground">
          Voice identity is validated against the global ElevenLabs API key
          configured in Settings. No API key is stored here.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="voice_id">Voice ID</Label>
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
            {voiceStatus.state === "ok" && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="size-4" />
                {voiceStatus.detail}
              </p>
            )}
            {voiceStatus.state === "error" && (
              <p className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
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
                  voiceStatus.state === "checking" || !form.voiceId.trim()
                }
              >
                {voiceStatus.state === "checking" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Validate Voice ID
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? "Validates this voice ID against the ElevenLabs account."
                : "Save the agent first, then return here to validate the voice ID."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  function renderTools() {
    return (
      <div className="flex flex-col gap-4">
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Puzzle className="size-4 text-muted-foreground" />
              <CardTitle>Assign Tools</CardTitle>
            </div>
            <CardDescription>
              Choose which registered tools this agent can use. Registering an
              assignment here does not execute any code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tools.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
                <ListChecks className="size-4" />
                No tools available. Tools are registered and managed in the
                backend.
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
                      className={cn(
                        "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                        toolView === "assigned"
                          ? "bg-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Assigned ({assignedTools.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setToolView("available")}
                      className={cn(
                        "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                        toolView === "available"
                          ? "bg-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
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
                            <p className="truncate text-sm font-medium">{tool.name}</p>
                            <AIStatusBadge status={tool.status} />
                          </div>
                          <p className="truncate text-sm text-muted-foreground">
                            {tool.description}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={toolView === "assigned" ? "outline" : "default"}
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

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-emerald-600" />
          {assignedTools.length} tool{assignedTools.length === 1 ? "" : "s"} selected.
        </div>
      </div>
    );
  }

  function renderKnowledge() {
    return (
      <div className="flex flex-col gap-4">
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="size-4 text-muted-foreground" />
              <CardTitle>Assign Knowledge Bases</CardTitle>
            </div>
            <CardDescription>
              Attach one or more knowledge bases. Documents are never duplicated —
              this only configures the existing relationships.
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
                      className={cn(
                        "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                        kbView === "assigned"
                          ? "bg-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Assigned ({assignedKbs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setKbView("available")}
                      className={cn(
                        "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                        kbView === "available"
                          ? "bg-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
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
                            <p className="truncate text-sm font-medium">{kb.name}</p>
                            <AIStatusBadge status={kb.status} />
                          </div>
                          <p className="truncate text-sm text-muted-foreground">
                            {kb.description}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={kbView === "assigned" ? "outline" : "default"}
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

        <Card size="sm">
          <CardHeader>
            <CardTitle>RAG Configuration</CardTitle>
            <CardDescription>
              Retrieval settings used when this agent consults its assigned
              knowledge bases.
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
                aria-label="Enable RAG"
                onClick={() => updateRag({ enabled: !form.runtime.rag.enabled })}
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
                  onChange={(e) => updateRag({ top_k: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Number of chunks retrieved per query.
                </p>
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
                    updateRag({ similarity_threshold: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Minimum relevance score for a chunk to be included.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Retrieval only uses knowledge bases assigned to this agent.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderReviewRow({
    label,
    children,
    editStep,
  }: {
    label: string;
    children: React.ReactNode;
    editStep: number;
  }) {
    return (
      <div className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <div className="mt-1 text-sm">{children}</div>
        </div>
        <button
          type="button"
          onClick={() => setStepIndex(editStep)}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PenLine className="size-3.5" />
          Edit
        </button>
      </div>
    );
  }

  function renderReview() {
    const hasInstructions = Boolean(form.instructions.trim());
    const hasVoice = Boolean(form.voiceId.trim());
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-muted-foreground" />
          <CardTitle>Review Agent</CardTitle>
        </div>
        <CardDescription>
          Confirm the details below, then {isEdit ? "save your changes" : "create the agent"}.
          Use Edit to jump back to any step.
        </CardDescription>

        <div className="mt-2">
          <p className="pt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            General
          </p>
          {renderReviewRow({ label: "Category", editStep: 0, children: selectedCategory?.name ?? "—" })}
          {renderReviewRow({ label: "Agent Name", editStep: 0, children: form.name || "—" })}
          {renderReviewRow({
            label: "Description",
            editStep: 0,
            children: form.description || <span className="text-muted-foreground">No description</span>,
          })}
          {renderReviewRow({
            label: "Lifecycle",
            editStep: 0,
            children: <AIStatusBadge status={form.lifecycle} />,
          })}

          <Separator />

          <p className="pt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Instructions
          </p>
          {renderReviewRow({
            label: "Instructions",
            editStep: 1,
            children: hasInstructions ? (
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Configured
              </span>
            ) : (
              <span className="text-muted-foreground">Not configured</span>
            ),
          })}

          <Separator />

          <p className="pt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Model &amp; Voice
          </p>
          {renderReviewRow({ label: "Model", editStep: 2, children: selectedModel })}
          {renderReviewRow({ label: "Temperature", editStep: 2, children: form.runtime.temperature })}
          {renderReviewRow({
            label: "Voice",
            editStep: 2,
            children: hasVoice ? (
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Configured
              </span>
            ) : (
              <span className="text-muted-foreground">None</span>
            ),
          })}

          <Separator />

          <p className="pt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Tools &amp; Knowledge
          </p>
          {renderReviewRow({ label: "Tools", editStep: 3, children: `${assignedTools.length} selected` })}
          {renderReviewRow({
            label: "Knowledge Bases",
            editStep: 4,
            children: `${assignedKbs.length} selected`,
          })}
          {renderReviewRow({
            label: "RAG",
            editStep: 4,
            children: (
              <Badge variant={form.runtime.rag.enabled ? "default" : "secondary"}>
                {form.runtime.rag.enabled ? "Enabled" : "Disabled"}
                {form.runtime.rag.enabled
                  ? ` · Top K ${form.runtime.rag.top_k} · ${form.runtime.rag.similarity_threshold}`
                  : ""}
              </Badge>
            ),
          })}
        </div>
      </div>
    );
  }

  const currentStep = STEPS[stepIndex];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <AiPageHeader
        title={isEdit ? "Edit Agent" : "Create Agent"}
        description={
          isEdit
            ? "Update this agent's configuration step by step."
            : "Configure your permanent AI agent step by step."
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
        <form onSubmit={onSubmit} noValidate>
          <Card>
            <CardHeader className="border-b">
              <div className="hidden md:block">
                <div className="flex items-center gap-2">
                  {STEPS.map((step, index) => {
                    const isActive = index === stepIndex;
                    const isCompleted = index < stepIndex;
                    const isClickable = index < stepIndex;
                    const StepIcon = step.icon;
                    return (
                      <div key={step.id} className="flex flex-1 items-center last:flex-none">
                        <button
                          type="button"
                          onClick={() => isClickable && handleJump(index)}
                          disabled={!isClickable}
                          className={cn(
                            "group flex flex-col items-start gap-1.5 rounded-lg px-1.5 py-1 text-left",
                            isClickable && "cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            !isClickable && "cursor-default",
                          )}
                          aria-current={isActive ? "step" : undefined}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "flex size-7 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                                isActive
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : isCompleted
                                    ? "border-primary/40 bg-primary/10 text-primary"
                                    : "border-input bg-muted text-muted-foreground",
                              )}
                            >
                              {isCompleted ? (
                                <Check className="size-3.5" />
                              ) : (
                                <StepIcon className="size-3.5" />
                              )}
                            </span>
                            <span
                              className={cn(
                                "text-sm font-medium",
                                isActive
                                  ? "text-foreground"
                                  : isCompleted
                                    ? "text-foreground"
                                    : "text-muted-foreground",
                              )}
                            >
                              {step.title}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "hidden text-xs lg:block",
                              isActive || isCompleted ? "text-muted-foreground" : "text-muted-foreground/60",
                            )}
                          >
                            {step.description}
                          </span>
                        </button>
                        {index < STEPS.length - 1 && (
                          <div
                            className={cn(
                              "mx-1 h-px flex-1 self-start lg:mt-3.5",
                              isCompleted ? "bg-primary/40" : "bg-border",
                            )}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="md:hidden">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="flex size-6 items-center justify-center rounded-full border border-primary bg-primary/10 text-xs text-primary">
                      {stepIndex + 1}
                    </span>
                    {currentStep.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Step {stepIndex + 1} of {STEPS.length}
                  </span>
                </div>
                <Progress value={((stepIndex + 1) / STEPS.length) * 100} />
                <div className="mt-3 flex items-center gap-1.5">
                  {STEPS.map((step, index) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => index < stepIndex && handleJump(index)}
                      disabled={index >= stepIndex}
                      aria-label={`Step ${index + 1}: ${step.title}`}
                      aria-current={index === stepIndex ? "step" : undefined}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        index === stepIndex
                          ? "bg-primary"
                          : index < stepIndex
                            ? "bg-primary/40 cursor-pointer hover:bg-primary/60"
                            : "bg-muted",
                      )}
                    />
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {stepIndex === 0 && renderGeneral()}
              {stepIndex === 1 && renderInstructions()}
              {stepIndex === 2 && renderModelVoice()}
              {stepIndex === 3 && renderTools()}
              {stepIndex === 4 && renderKnowledge()}
              {stepIndex === 5 && renderReview()}

              {!isLastStep && (
                <div className="mt-6 flex justify-end">
                  <p className="text-sm text-muted-foreground">
                    {currentStep.description}
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter className="justify-between gap-3">
              <div>
                {!isFirstStep && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={pending}
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                )}
              </div>

              <div className="ml-auto flex items-center gap-2">
                {!isLastStep ? (
                  <Button type="button" onClick={handleNext}>
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={!canSave}>
                    {pending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {isEdit ? "Saving..." : "Creating agent..."}
                      </>
                    ) : (
                      <>
                        {isEdit ? <Check className="size-4" /> : <Plus className="size-4" />}
                        {isEdit ? "Save Changes" : "Create Agent"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>

          {successMessage && (
            <div className="mt-4">
              <AiMessageBanner
                kind="success"
                onDismiss={() => setSuccessMessage(null)}
              >
                {successMessage}
              </AiMessageBanner>
            </div>
          )}
          {errorMessage && (
            <div className="mt-4">
              <AiMessageBanner
                kind="error"
                onDismiss={() => setErrorMessage(null)}
              >
                {errorMessage}
              </AiMessageBanner>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
