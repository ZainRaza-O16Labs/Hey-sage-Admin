import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

export type AiCategory = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  instructions: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type ParentAgentConfig = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  instructions: string;
  automatic_selection: boolean;
  fallback_agent_id: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export const DEFAULT_ORGANIZATION_ID =
  "a0000000-0000-4000-8000-000000000001";

export class AiManagementStoreError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
    this.name = "AiManagementStoreError";
  }
}

export function requireStore() {
  if (!isSupabaseAdminConfigured()) {
    throw new AiManagementStoreError(
      "Supabase service role is not configured.",
      503,
    );
  }
  return createAdminClient();
}

function isMissingRelation(message: string) {
  return /could not find the table|relation .* does not exist|schema cache/i.test(
    message,
  );
}

function storeError(error: { message: string }) {
  if (isMissingRelation(error.message)) {
    return new AiManagementStoreError(
      "AI Management schema is not installed. Apply the Supabase migrations in order.",
      503,
    );
  }
  return new AiManagementStoreError(error.message);
}

export async function listCategories(): Promise<AiCategory[]> {
  const { data, error } = await requireStore()
    .from("ai_categories")
    .select("*")
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .order("name");
  if (error) throw storeError(error);
  return (data ?? []) as AiCategory[];
}

export async function createCategory(input: {
  name: string;
  description: string;
  instructions: string;
  status: "active" | "inactive";
}): Promise<AiCategory> {
  const { data, error } = await requireStore()
    .from("ai_categories")
    .insert({ organization_id: DEFAULT_ORGANIZATION_ID, ...input })
    .select("*")
    .single();
  if (error || !data) throw storeError(error ?? { message: "Could not create category." });
  return data as AiCategory;
}

export async function getParentAgentConfig(): Promise<ParentAgentConfig | null> {
  const { data, error } = await requireStore()
    .from("ai_parent_agent_config")
    .select("*")
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .maybeSingle();
  if (error) throw storeError(error);
  return (data as ParentAgentConfig | null) ?? null;
}

export async function updateParentAgentConfig(input: {
  name: string;
  description: string;
  instructions: string;
  automatic_selection: boolean;
  fallback_agent_id: string | null;
  status: "active" | "inactive";
}): Promise<ParentAgentConfig> {
  const { data, error } = await requireStore()
    .from("ai_parent_agent_config")
    .upsert(
      { organization_id: DEFAULT_ORGANIZATION_ID, ...input },
      { onConflict: "organization_id" },
    )
    .select("*")
    .single();
  if (error || !data) throw storeError(error ?? { message: "Could not save the AI Router configuration." });
  return data as ParentAgentConfig;
}

export async function getCategory(id: string): Promise<AiCategory> {
  const { data, error } = await requireStore()
    .from("ai_categories")
    .select("*")
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .maybeSingle();
  if (error) throw storeError(error);
  if (!data) throw new AiManagementStoreError("Category not found.", 404);
  return data as AiCategory;
}

export async function updateCategory(
  id: string,
  input: {
    name: string;
    description: string;
    instructions: string;
    status: "active" | "inactive";
  }
): Promise<AiCategory> {
  const { data, error } = await requireStore()
    .from("ai_categories")
    .update(input)
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .select("*")
    .single();
  if (error || !data) throw storeError(error ?? { message: "Could not update category." });
  return data as AiCategory;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await requireStore()
    .from("ai_categories")
    .delete()
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID);
  if (error) throw storeError(error);
}

// ── Tools ───────────────────────────────────────────────────────────────

export type AiToolConfig = {
  id: string;
  organization_id: string;
  name: string;
  key: string;
  description: string;
  status: "active" | "inactive";
  config?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const TOOL_COLUMNS =
  "id, organization_id, name, tool_key, description, status, config, created_at, updated_at";

export function mapToolRow(row: Record<string, unknown>): AiToolConfig {
  return {
    id: String(row.id),
    organization_id: String(
      row.organization_id ?? "a0000000-0000-4000-8000-000000000001",
    ),
    name: String(row.name ?? ""),
    key: String(row.tool_key ?? ""),
    description: String(row.description ?? ""),
    status: row.status === "inactive" ? "inactive" : "active",
    config:
      row.config && typeof row.config === "object"
        ? (row.config as Record<string, unknown>)
        : undefined,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function listTools(): Promise<AiToolConfig[]> {
  const { data, error } = await requireStore()
    .from("ai_tools")
    .select(TOOL_COLUMNS)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .order("name");
  if (error) throw storeError(error);
  return (data ?? []).map((row) => mapToolRow(row as Record<string, unknown>));
}

export async function getTool(id: string): Promise<AiToolConfig | null> {
  const { data, error } = await requireStore()
    .from("ai_tools")
    .select(TOOL_COLUMNS)
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .maybeSingle();
  if (error) throw storeError(error);
  return data ? mapToolRow(data as Record<string, unknown>) : null;
}

export async function listToolsByAgent(agentId: string): Promise<AiToolConfig[]> {
  const { data, error } = await requireStore()
    .from("ai_agent_tools")
    .select(`ai_tools(${TOOL_COLUMNS})`)
    .eq("agent_id", agentId);
  if (error) throw storeError(error);
  const tools: AiToolConfig[] = [];
  for (const row of data ?? []) {
    const raw = (row as { ai_tools?: unknown }).ai_tools;
    const tool = Array.isArray(raw) ? (raw[0] as Record<string, unknown> | undefined) : (raw as Record<string, unknown> | undefined);
    if (tool && typeof tool === "object") {
      tools.push(mapToolRow(tool));
    }
  }
  return tools;
}

export async function listAgentsByTool(toolId: string): Promise<Array<{
  id: string;
  name: string;
}>> {
  const { data, error } = await requireStore()
    .from("ai_agent_tools")
    .select("agents(id, name)")
    .eq("tool_id", toolId);
  if (error) throw storeError(error);
  const agents: Array<{ id: string; name: string }> = [];
  for (const row of data ?? []) {
    const raw = (row as { agents?: unknown }).agents;
    const agent = Array.isArray(raw) ? (raw[0] as Record<string, unknown> | undefined) : (raw as Record<string, unknown> | undefined);
    if (agent && typeof agent === "object") {
      agents.push({
        id: String(agent.id),
        name: String(agent.name),
      });
    }
  }
  return agents;
}

export async function _getToolIdsByAgent(agentId: string): Promise<string[]> {
  const { data, error } = await requireStore()
    .from("ai_agent_tools")
    .select("tool_id")
    .eq("agent_id", agentId);
  if (error) throw storeError(error);
  return (data ?? []).map((row) => String((row as { tool_id?: string }).tool_id ?? ""));
}

export async function listAgentKnowledgeBaseAssignments(
  agentId: string,
): Promise<string[]> {
  const { data, error } = await requireStore()
    .from("ai_agent_knowledge_bases")
    .select("knowledge_base_id")
    .eq("agent_id", agentId);
  if (error) throw storeError(error);
  return (data ?? []).map((row) =>
    String((row as { knowledge_base_id?: string }).knowledge_base_id ?? ""),
  );
}

/** Replace an agent's tool + KB assignments. Deletes stale rows first. */
export async function syncAgentAssignments(
  agentId: string,
  input: {
    toolIds: string[];
    knowledgeBaseIds: string[];
  },
): Promise<void> {
  const supabase = requireStore();
  const { error: toolsDeleteError } = await supabase
    .from("ai_agent_tools")
    .delete()
    .eq("agent_id", agentId);
  if (toolsDeleteError) throw storeError(toolsDeleteError);
  const { error: kbDeleteError } = await supabase
    .from("ai_agent_knowledge_bases")
    .delete()
    .eq("agent_id", agentId);
  if (kbDeleteError) throw storeError(kbDeleteError);

  const toolRows = input.toolIds.map((tool_id) => ({
    agent_id: agentId,
    tool_id,
  }));
  const kbRows = input.knowledgeBaseIds.map((knowledge_base_id) => ({
    agent_id: agentId,
    knowledge_base_id,
  }));

  if (toolRows.length > 0) {
    const { error: toolsError } = await supabase
      .from("ai_agent_tools")
      .insert(toolRows);
    if (toolsError) throw storeError(toolsError);
  }
  if (kbRows.length > 0) {
    const { error: kbError } = await supabase
      .from("ai_agent_knowledge_bases")
      .insert(kbRows);
    if (kbError) throw storeError(kbError);
  }
}

// ── Knowledge Bases ────────────────────────────────────────────────────

export type AiKnowledgeBaseRow = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type AiKnowledgeBaseStats = {
  documentCount: number;
  chunkCount: number;
  agentCount: number;
  readyDocumentCount: number;
};

const KNOWLEDGE_BASE_COLUMNS =
  "id, organization_id, name, description, status, created_at, updated_at";

export async function listKnowledgeBases(): Promise<AiKnowledgeBaseRow[]> {
  const { data, error } = await requireStore()
    .from("ai_knowledge_bases")
    .select(KNOWLEDGE_BASE_COLUMNS)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .order("name");
  if (error) throw storeError(error);
  return (data ?? []) as AiKnowledgeBaseRow[];
}

export async function getKnowledgeBase(id: string): Promise<AiKnowledgeBaseRow> {
  const { data, error } = await requireStore()
    .from("ai_knowledge_bases")
    .select(KNOWLEDGE_BASE_COLUMNS)
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .maybeSingle();
  if (error) throw storeError(error);
  if (!data) throw new AiManagementStoreError("Knowledge base not found.", 404);
  return data as AiKnowledgeBaseRow;
}

export async function createKnowledgeBase(input: {
  name: string;
  description: string;
  status: "active" | "inactive";
}): Promise<AiKnowledgeBaseRow> {
  const { data, error } = await requireStore()
    .from("ai_knowledge_bases")
    .insert({ organization_id: DEFAULT_ORGANIZATION_ID, ...input })
    .select(KNOWLEDGE_BASE_COLUMNS)
    .single();
  if (error || !data) {
    throw new AiManagementStoreError(
      error?.message ?? "Could not create knowledge base.",
    );
  }
  return data as AiKnowledgeBaseRow;
}

export async function updateKnowledgeBase(
  id: string,
  input: {
    name?: string;
    description?: string;
    status?: "active" | "inactive";
  },
): Promise<AiKnowledgeBaseRow> {
  const { data, error } = await requireStore()
    .from("ai_knowledge_bases")
    .update(input)
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .select(KNOWLEDGE_BASE_COLUMNS)
    .single();
  if (error || !data) {
    if (error?.code === "PGRST116") {
      throw new AiManagementStoreError("Knowledge base not found.", 404);
    }
    throw new AiManagementStoreError(
      error?.message ?? "Could not update knowledge base.",
    );
  }
  return data as AiKnowledgeBaseRow;
}

export async function deleteKnowledgeBase(id: string): Promise<void> {
  const supabase = requireStore();
  const existing = await getKnowledgeBase(id).catch(() => null);
  if (!existing) throw new AiManagementStoreError("Knowledge base not found.", 404);

  const { data: docs } = await supabase
    .from("knowledge_documents")
    .select("storage_path")
    .eq("knowledge_base_id", id);
  const paths = (docs ?? [])
    .map((row) => (row as { storage_path?: string }).storage_path)
    .filter((path): path is string => Boolean(path));
  if (paths.length > 0) {
    await supabase.storage.from("agent-documents").remove(paths);
  }

  // Remove document rows before the KB so FK-safe in either direction.
  await supabase
    .from("knowledge_documents")
    .delete()
    .eq("knowledge_base_id", id);

  const { error } = await supabase
    .from("ai_knowledge_bases")
    .delete()
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID);
  if (error) throw storeError(error);
}

export async function getKnowledgeBaseStats(
  id: string,
): Promise<AiKnowledgeBaseStats> {
  const supabase = requireStore();
  const [{ count: documentCount }, chunkQuery, agentQuery] = await Promise.all([
    supabase
      .from("knowledge_documents")
      .select("id", { count: "exact", head: true })
      .eq("knowledge_base_id", id),
    supabase
      .from("knowledge_documents")
      .select("chunk_count, status")
      .eq("knowledge_base_id", id),
    supabase
      .from("ai_agent_knowledge_bases")
      .select("agent_id", { count: "exact", head: true })
      .eq("knowledge_base_id", id),
  ]);

  const chunkCount = (chunkQuery.data ?? []).reduce(
    (sum, row) =>
      sum + (typeof (row as { chunk_count?: number }).chunk_count === "number" ? (row as { chunk_count: number }).chunk_count : 0),
    0,
  );
  const readyDocumentCount = (chunkQuery.data ?? []).filter(
    (row) => (row as { status?: string }).status === "ready",
  ).length;
  return {
    documentCount: documentCount ?? 0,
    chunkCount,
    agentCount: agentQuery.count ?? 0,
    readyDocumentCount,
  };
}

// ── Settings ────────────────────────────────────────────────────────────

export type AiSettings = {
  default_model: string;
  default_temperature: number;
  default_top_k: number;
  similarity_threshold: number;
  memory_enabled: boolean;
};

const SETTING_DEFAULTS: AiSettings = {
  default_model: "gpt-4o",
  default_temperature: 0.7,
  default_top_k: 5,
  similarity_threshold: 0.7,
  memory_enabled: true,
};

function readConfig(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  const row = data as { config?: unknown };
  return row.config && typeof row.config === "object"
    ? (row.config as Record<string, unknown>)
    : {};
}

export async function getAISettings(): Promise<AiSettings & {
  elevenlabs_configured: boolean;
  elevenlabs_source: "env" | "database" | "not_configured";
}> {
  const { data, error } = await requireStore()
    .from("ai_settings")
    .select("config")
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .maybeSingle();
  if (error) throw storeError(error);

  const config = readConfig(data);
  const firstName = (key: string, fallback: number | string | boolean) => {
    const value = config[key];
    return typeof value === typeof fallback ? value : fallback;
  };

  const envKey = process.env.ELEVENLABS_API_KEY?.trim() ?? "";
  const elevenlabs_key: string = "elevenlabs_api_key" in config ? String(config.elevenlabs_api_key ?? "") : "";
  const elevenlabs_source = envKey.startsWith("sk_")
    ? ("env" as const)
    : elevenlabs_key.startsWith("sk_")
      ? ("database" as const)
      : ("not_configured" as const);

  return {
    default_model: String(firstName("default_model", SETTING_DEFAULTS.default_model)),
    default_temperature: Number(firstName("default_temperature", SETTING_DEFAULTS.default_temperature)),
    default_top_k: Number(firstName("default_top_k", SETTING_DEFAULTS.default_top_k)),
    similarity_threshold: Number(firstName("similarity_threshold", SETTING_DEFAULTS.similarity_threshold)),
    memory_enabled: Boolean(firstName("memory_enabled", SETTING_DEFAULTS.memory_enabled)),
    elevenlabs_configured: elevenlabs_source !== "not_configured",
    elevenlabs_source,
  };
}

export async function updateAISettings(input: Partial<AiSettings> & {
  elevenlabs_api_key?: string | null;
}): Promise<AiSettings & {
  elevenlabs_configured: boolean;
  elevenlabs_source: "env" | "database" | "not_configured";
}> {
  const current = await getAISettings();
  const config: Record<string, unknown> = {
    default_model: input.default_model ?? current.default_model,
    default_temperature: input.default_temperature ?? current.default_temperature,
    default_top_k: input.default_top_k ?? current.default_top_k,
    similarity_threshold: input.similarity_threshold ?? current.similarity_threshold,
    memory_enabled: input.memory_enabled ?? current.memory_enabled,
  };
  if ("elevenlabs_api_key" in input) {
    const key = input.elevenlabs_api_key?.trim() ?? "";
    if (!key) {
      delete config.elevenlabs_api_key;
    } else {
      config.elevenlabs_api_key = key;
    }
  }

  const { data, error } = await requireStore()
    .from("ai_settings")
    .upsert(
      { organization_id: DEFAULT_ORGANIZATION_ID, config },
      { onConflict: "organization_id" },
    )
    .select("config")
    .single();
  if (error || !data) {
    throw new AiManagementStoreError(
      error?.message ?? "Could not save settings.",
    );
  }
  return getAISettings();
}

/**
 * Server-side only. Used by the ElevenLabs validation routes and never returned
 * to the browser. Env var takes precedence over the stored value.
 */
export async function getElevenLabsApiKey(): Promise<string> {
  const envKey = process.env.ELEVENLABS_API_KEY?.trim() ?? "";
  if (envKey.startsWith("sk_")) return envKey;
  const settings = await getAISettings();
  if (settings.elevenlabs_source === "database") {
    const { data } = await requireStore()
      .from("ai_settings")
      .select("config")
      .eq("organization_id", DEFAULT_ORGANIZATION_ID)
      .maybeSingle();
    const config = readConfig(data);
    const stored = "elevenlabs_api_key" in config ? String(config.elevenlabs_api_key ?? "") : "";
    if (stored.startsWith("sk_")) return stored;
  }
  return "";
}
