"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  Info,
  ListChecks,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { BackNav } from "@/components/ai-management/back-nav";
import { AIErrorState } from "@/components/ai-management/ai-error-state";
import { AIFormSkeleton } from "@/components/ai-management/ai-skeleton";
import { AIStatusBadge } from "@/components/ai-management/ai-status-badge";
import { AiKnowledgeBaseDocumentsPanel } from "@/components/ai-management/ai-knowledge-base-documents-panel";
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
import type { Agent } from "@/lib/agents/schema";
import type { AiDocument, AiKnowledgeBase } from "@/lib/ai-management/knowledge-bases";
import type { AiSettings } from "@/lib/ai-management/settings";
import {
  createKnowledgeBaseApi,
  updateKnowledgeBase,
} from "@/lib/ai-management/knowledge-bases";
import { runtimeConfigFromConfiguration } from "@/lib/ai-management/agent-config";
import { notifyError, notifySuccess } from "@/lib/notify";
import { cn } from "@/lib/utils";

type KnowledgeBaseFormProps = {
  mode: "create" | "edit";
  knowledgeBaseId?: string;
};

const STEPS = [
  "Basic Information",
  "Documents",
  "Agents",
  "Retrieval Settings",
] as const;

const STEP_COUNT = STEPS.length;

type FormInput = {
  name: string;
  description: string;
  status: "active" | "inactive";
};

export function KnowledgeBaseForm({
  mode,
  knowledgeBaseId,
}: KnowledgeBaseFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [form, setForm] = useState<FormInput>({
    name: "",
    description: "",
    status: "active",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormInput, string>>>(
    {},
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<ReadonlySet<number>>(
    new Set(),
  );
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const [knowledgeBase, setKnowledgeBase] = useState<AiKnowledgeBase | null>(
    null,
  );
  const [documents, setDocuments] = useState<AiDocument[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assignedAgentIds, setAssignedAgentIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<AiSettings | null>(null);

  const [loadKey, setLoadKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [agentSearch, setAgentSearch] = useState("");
  const [agentView, setAgentView] = useState<"assigned" | "available">(
    "assigned",
  );

  useEffect(() => {
    let active = true;

    async function load() {
      const agentsResponse = await fetch("/api/agents");
      let loadedAgents: Agent[] = [];
      let loadedSettings: AiSettings | null = null;
      if (agentsResponse.ok) {
        const data = (await agentsResponse.json()) as { agents?: Agent[] };
        loadedAgents = data.agents ?? [];
      }
      const settingsResponse = await fetch("/api/ai-management/settings");
      if (settingsResponse.ok) {
        const data = (await settingsResponse.json()) as {
          settings?: AiSettings;
        };
        loadedSettings = data.settings ?? null;
      }

      let assignedIds: string[] = [];
      if (isEdit && knowledgeBaseId) {
        const response = await fetch(
          `/api/ai-management/knowledge-bases/${knowledgeBaseId}`,
        );
        if (!active) return;
        if (response.status === 404) {
          setLoadError("Knowledge base not found.");
          return;
        }
        if (!response.ok) {
          setLoadError("Could not load knowledge base.");
          return;
        }
        const data = (await response.json()) as {
          knowledgeBase?: AiKnowledgeBase;
        };
        const loaded = data.knowledgeBase;
        if (!loaded) {
          setLoadError("Knowledge base not found.");
          return;
        }
        if (!active) return;
        setKnowledgeBase(loaded);
        setForm({
          name: loaded.name,
          description: loaded.description,
          status: loaded.status,
        });
        assignedIds = loadedAgents
          .filter((agent) =>
            runtimeConfigFromConfiguration(agent.configuration).knowledge_base_ids.includes(
              loaded.id,
            ),
          )
          .map((agent) => agent.id);
      }

      if (!active) return;
      setAgents(loadedAgents);
      setSettings(loadedSettings);
      setAssignedAgentIds(assignedIds);
    }

    void load();
    return () => {
      active = false;
    };
  }, [knowledgeBaseId, isEdit, loadKey]);

  const kbid = knowledgeBase?.id;

  useEffect(() => {
    if (currentStep !== 2 || !kbid) return;
    let active = true;
    fetch(`/api/ai-management/knowledge-bases/${kbid}/documents`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { documents?: AiDocument[] } | null) => {
        if (active && data) {
          setDocuments(data.documents ?? []);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [currentStep, kbid]);

  const stepMountedRef = useRef(false);

  useEffect(() => {
    if (!stepMountedRef.current) {
      stepMountedRef.current = true;
      return;
    }
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [currentStep]);

  function update<K extends keyof FormInput>(key: K, value: FormInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateStep(step: number): boolean {
    const next: typeof errors = {};
    if (step === 1) {
      if (!form.name.trim()) {
        next.name = "Name is required.";
      } else if (form.name.trim().length > 80) {
        next.name = "Name must be 80 characters or less.";
      }
      if (form.description.trim().length > 280) {
        next.description = "Description must be 280 characters or less.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function toggleAgent(id: string) {
    setAssignedAgentIds((prev) =>
      prev.includes(id)
        ? prev.filter((agentId) => agentId !== id)
        : [...prev, id],
    );
  }

  const assignedAgents = agents.filter((agent) =>
    assignedAgentIds.includes(agent.id),
  );
  const availableAgents = agents.filter(
    (agent) => !assignedAgentIds.includes(agent.id),
  );
  const filteredAgents = agents.filter((agent) => {
    const matchesView =
      agentView === "assigned"
        ? assignedAgentIds.includes(agent.id)
        : !assignedAgentIds.includes(agent.id);
    const matchesSearch = `${agent.name} ${agent.description}`
      .toLowerCase()
      .includes(agentSearch.toLowerCase());
    return matchesView && matchesSearch;
  });

  async function handleNext() {
    if (currentStep >= STEP_COUNT) return;
    if (!validateStep(currentStep)) return;

    if (mode === "create" && currentStep === 1) {
      setPending(true);
      try {
        if (knowledgeBase) {
          await updateKnowledgeBase(knowledgeBase.id, {
            name: form.name,
            description: form.description,
            status: form.status,
          });
          notifySuccess("Knowledge base updated successfully.");
        } else {
          const created = await createKnowledgeBaseApi({
            name: form.name,
            description: form.description,
            status: form.status,
          });
          setKnowledgeBase(created);
          notifySuccess("Knowledge base created successfully.");
          setCompletedSteps((prev) => {
            const next = new Set(prev);
            next.add(1);
            return next;
          });
          setCurrentStep(2);
          return;
        }
      } catch (err) {
        notifyError(
          err instanceof Error ? err.message : "Could not create the knowledge base.",
        );
        return;
      } finally {
        setPending(false);
      }
    }

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
    const completed = step < currentStep || completedSteps.has(step);
    if (!completed) return;
    if (mode === "create" && step > 1 && !knowledgeBase) return;
    setCurrentStep(step);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentStep < STEP_COUNT) return;
    setPending(true);

    try {
      let kb = knowledgeBase;
      if (!kb) {
        kb = await createKnowledgeBaseApi({
          name: form.name,
          description: form.description,
          status: form.status,
        });
        setKnowledgeBase(kb);
      } else {
        await updateKnowledgeBase(kb.id, {
          name: form.name,
          description: form.description,
          status: form.status,
        });
      }

      const kbId = kb.id;
      for (const agent of agents) {
        const runtime = runtimeConfigFromConfiguration(agent.configuration);
        const has = runtime.knowledge_base_ids.includes(kbId);
        const want = assignedAgentIds.includes(agent.id);
        if (has === want) continue;

        const nextIds = has
          ? runtime.knowledge_base_ids.filter((id) => id !== kbId)
          : [...runtime.knowledge_base_ids, kbId];

        const response = await fetch(`/api/agents/${agent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            configuration: {
              ...agent.configuration,
              knowledge_base_ids: nextIds,
            },
          }),
        });
        if (!response.ok) {
          throw new Error(
            `Could not update assignment for agent "${agent.name}".`,
          );
        }
      }

      if (isEdit) {
        router.refresh();
        notifySuccess("Knowledge base updated successfully.");
      } else {
        notifySuccess("Knowledge base created successfully.");
        router.push(`/ai-management/knowledge-bases/${kbId}`);
        router.refresh();
      }
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : "Could not save knowledge base.",
      );
    } finally {
      setPending(false);
    }
  }

  const isLastStep = currentStep === STEP_COUNT;
  const submitLabel = pending
    ? "Saving..."
    : isEdit
      ? "Save Changes"
      : "Create Knowledge Base";

  const basicInformationFields = (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g., Product Documentation"
          aria-invalid={Boolean(errors.name)}
          required
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What knowledge does this base contain?"
          rows={4}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description}</p>
        )}
      </div>
      <div className="max-w-xs space-y-2">
        <Label htmlFor="status">Status</Label>
        <NativeSelect
          id="status"
          value={form.status}
          onChange={(e) => update("status", e.target.value as FormInput["status"])}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </NativeSelect>
        <p className="text-xs text-muted-foreground">
          Inactive knowledge bases cannot be used for retrieval by agents.
        </p>
      </div>
    </div>
  );

  const documentsFields = (
    <div className="flex flex-col gap-4">
      {knowledgeBase ? (
        <AiKnowledgeBaseDocumentsPanel
          knowledgeBaseId={knowledgeBase.id}
          initialDocuments={documents}
        />
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
          <Database className="size-4" />
          Documents become available after the knowledge base is created.
        </div>
      )}
    </div>
  );

  const agentsFields = (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <CardTitle>Agents</CardTitle>
          </div>
          <CardDescription>
            Select which agents can use this knowledge base for retrieval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
              <Users className="size-4" />
              No agents available. Create an agent first.
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative max-w-xs flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    placeholder="Search agents..."
                    className="pl-8"
                    aria-label="Search agents"
                  />
                </div>
                <div className="flex gap-1 rounded-lg bg-muted p-0.5">
                  {(["assigned", "available"] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setAgentView(view)}
                      className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                        agentView === view
                          ? "bg-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {view === "assigned"
                        ? `Assigned (${assignedAgents.length})`
                        : `Available (${availableAgents.length})`}
                    </button>
                  ))}
                </div>
              </div>

              {filteredAgents.length === 0 ? (
                <div className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  {agentView === "assigned"
                    ? "No agents assigned to this knowledge base yet."
                    : "No available agents match your search."}
                </div>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {filteredAgents.map((agent) => {
                    const isAssigned = assignedAgentIds.includes(agent.id);
                    return (
                      <li
                        key={agent.id}
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
                              {agent.name}
                            </p>
                            <AIStatusBadge status={agent.status} />
                          </div>
                          <p className="ml-5.5 truncate text-sm text-muted-foreground">
                            {agent.description || "No description"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={isAssigned ? "outline" : "default"}
                          onClick={() => toggleAgent(agent.id)}
                        >
                          {isAssigned ? (
                            <>
                              <X className="size-3.5" /> Remove
                            </>
                          ) : (
                            <>
                              <Check className="size-3.5" /> Assign
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
      <p className="text-sm text-muted-foreground">
        Retrieval is performed only from knowledge bases assigned to the
        selected agent. Agent assignment can also be edited from any
        agent&apos;s Knowledge page.
      </p>
    </div>
  );

  const retrievalFields = (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            <CardTitle>Retrieval Settings</CardTitle>
          </div>
          <CardDescription>
            Retrieval configuration used when agents search this knowledge base.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y rounded-lg border">
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <dt className="text-sm text-muted-foreground">Top K (default)</dt>
              <dd className="text-sm font-medium">
                {settings?.default_top_k ?? 5}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <dt className="text-sm text-muted-foreground">
                Similarity Threshold (default)
              </dt>
              <dd className="text-sm font-medium">
                {settings?.similarity_threshold ?? 0.7}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <dt className="text-sm text-muted-foreground">
                Enable RAG per agent
              </dt>
              <dd className="text-right text-sm text-muted-foreground">
                Configured in each assigned agent&apos;s Knowledge settings
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border bg-muted/50 px-4 py-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          Retrieval is performed only from Knowledge Bases assigned to the
          selected agent. Documents become searchable after indexing completes.
        </p>
      </div>
    </div>
  );

  const stepContent = [
    basicInformationFields,
    documentsFields,
    agentsFields,
    retrievalFields,
  ];

  if (isEdit && !knowledgeBase && !loadError) {
    return (
      <div className="flex w-full flex-col gap-6">
        <BackNav
          href={
            knowledgeBaseId
              ? `/ai-management/knowledge-bases/${knowledgeBaseId}`
              : "/ai-management/knowledge-bases"
          }
          label="Knowledge Bases"
        />
        <AiPageHeader
          title="Edit Knowledge Base"
          description="Update this knowledge base and its assigned agents and documents."
        />
        <AIFormSkeleton />
      </div>
    );
  }

  if (isEdit && loadError) {
    return (
      <div className="flex w-full flex-col gap-6">
        <BackNav href="/ai-management/knowledge-bases" label="Knowledge Bases" />
        <AiPageHeader
          title="Edit Knowledge Base"
          description="Update this knowledge base and its assigned agents and documents."
        />
        <AIErrorState
          title="Unable to load knowledge base"
          description={loadError}
          onRetry={() => {
            setLoadError(null);
            setLoadKey((key) => key + 1);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <BackNav
        href={
          isEdit && (knowledgeBaseId ?? knowledgeBase?.id)
            ? `/ai-management/knowledge-bases/${knowledgeBaseId ?? knowledgeBase?.id}`
            : "/ai-management/knowledge-bases"
        }
        label="Knowledge Bases"
      />
      <AiPageHeader
        title={isEdit ? "Edit Knowledge Base" : "Create Knowledge Base"}
        description={
          isEdit
            ? "Update the knowledge base name, documents, assigned agents and retrieval defaults."
            : "Create a knowledge base and configure its documents, assigned agents and retrieval defaults."
        }
      />

      <Card>
        <CardHeader className="border-b">
          <nav
            aria-label="Knowledge base setup steps"
            className="-mx-1 overflow-x-auto px-1 pb-1"
          >
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
                      <span
                        className="h-px w-8 bg-border"
                        aria-hidden="true"
                      />
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
              className="flex items-center gap-2 text-base font-semibold outline-none"
            >
              <ListChecks className="size-4 text-muted-foreground" />
              Step {currentStep} of {STEP_COUNT}: {STEPS[currentStep - 1]}
            </h2>

            {stepContent[currentStep - 1]}

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
                    onClick={() => void handleNext()}
                    disabled={pending}
                  >
                    {pending && mode === "create" && currentStep === 1
                      ? "Creating..."
                      : "Next"}
                    <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={pending}>
                    {submitLabel}
                    {!pending && <ArrowRight className="size-4" />}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
