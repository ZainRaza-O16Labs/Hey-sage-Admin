export const AI_MODELS = [
  { value: "gpt-5", label: "GPT-5" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o mini" },
  { value: "gpt-4.1", label: "GPT-4.1" },
  { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
  { value: "claude-opus-4", label: "Claude Opus 4" },
] as const;

export type AgentModel = (typeof AI_MODELS)[number]["value"];

export type AgentRuntimeConfig = {
  category_id: string;
  model: string;
  temperature: number;
  tools: string[];
  knowledge_base_ids: string[];
  rag: {
    enabled: boolean;
    top_k: number;
    similarity_threshold: number;
  };
};

export function defaultRuntimeConfig(): AgentRuntimeConfig {
  return {
    category_id: "",
    model: "gpt-5",
    temperature: 0.2,
    tools: [],
    knowledge_base_ids: [],
    rag: {
      enabled: false,
      top_k: 3,
      similarity_threshold: 0.5,
    },
  };
}

export function runtimeConfigFromConfiguration(
  configuration: Record<string, unknown> | null | undefined,
): AgentRuntimeConfig {
  const cfg = configuration ?? {};
  const readString = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";
  const readNumber = (value: unknown, fallback: number) => {
    const num = typeof value === "number" ? value : Number(value);
    return Number.isFinite(num) ? num : fallback;
  };
  const readStringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];

  const rag = (cfg.rag && typeof cfg.rag === "object" ? cfg.rag : {}) as Record<
    string,
    unknown
  >;

  return {
    category_id: readString(cfg.category_id),
    model: readString(cfg.model) || "gpt-5",
    temperature: readNumber(cfg.temperature, 0.2),
    tools: readStringArray(cfg.tools),
    knowledge_base_ids: readStringArray(cfg.knowledge_base_ids),
    rag: {
      enabled: Boolean(rag.enabled),
      top_k: readNumber(rag.top_k, 3),
      similarity_threshold: readNumber(rag.similarity_threshold, 0.5),
    },
  };
}

export function configurationFromRuntime(runtime: AgentRuntimeConfig): Record<
  string,
  unknown
> {
  return {
    category_id: runtime.category_id,
    model: runtime.model,
    temperature: runtime.temperature,
    tools: runtime.tools,
    knowledge_base_ids: runtime.knowledge_base_ids,
    rag: {
      enabled: runtime.rag.enabled,
      top_k: runtime.rag.top_k,
      similarity_threshold: runtime.rag.similarity_threshold,
    },
  };
}
