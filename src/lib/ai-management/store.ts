import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import { uniqueSlug } from "@/lib/ai-management/slug";
import { writeActivityLog } from "@/lib/ai-management/activity-logs";

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
  automatic_routing: boolean;
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

function mapParentAgentConfig(row: Record<string, unknown>): ParentAgentConfig {
  return {
    id: String(row.id ?? ""),
    organization_id: String(row.organization_id ?? DEFAULT_ORGANIZATION_ID),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    instructions: String(row.instructions ?? ""),
    automatic_routing:
      typeof row.automatic_routing === "boolean" ? row.automatic_routing : true,
    fallback_agent_id:
      typeof row.fallback_agent_id === "string" ? row.fallback_agent_id : null,
    status: row.status === "inactive" ? "inactive" : "active",
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
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
    .insert({
      organization_id: DEFAULT_ORGANIZATION_ID,
      slug: uniqueSlug(input.name),
      ...input,
    })
    .select("*")
    .single();
  if (error || !data) throw storeError(error ?? { message: "Could not create category." });
  const category = data as AiCategory;
  void writeActivityLog({
    action: "create",
    entityType: "ai_categories",
    entityId: category.id,
    newData: category as unknown as Record<string, unknown>,
  });
  return category;
}

export async function getParentAgentConfig(): Promise<ParentAgentConfig | null> {
  const { data, error } = await requireStore()
    .from("ai_parent_agent_config")
    .select("*")
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .maybeSingle();
  if (error) throw storeError(error);
  if (!data) return null;
  return mapParentAgentConfig(data as Record<string, unknown>);
}

export async function updateParentAgentConfig(input: {
  name: string;
  description: string;
  instructions: string;
  automatic_routing: boolean;
  fallback_agent_id: string | null;
  status: "active" | "inactive";
}): Promise<ParentAgentConfig> {
  const previous = await getParentAgentConfig();
  const { data, error } = await requireStore()
    .from("ai_parent_agent_config")
    .upsert(
      { organization_id: DEFAULT_ORGANIZATION_ID, ...input },
      { onConflict: "organization_id" },
    )
    .select("*")
    .single();
  if (error || !data) throw storeError(error ?? { message: "Could not save the AI Router configuration." });
  const config = mapParentAgentConfig(data as Record<string, unknown>);
  void writeActivityLog({
    action: "configure",
    entityType: "ai_parent_agent_config",
    entityId: config.id,
    oldData: previous as unknown as Record<string, unknown> | null,
    newData: config as unknown as Record<string, unknown>,
  });
  return config;
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
  const previous = await getCategory(id).catch(() => null);
  const { data, error } = await requireStore()
    .from("ai_categories")
    .update(input)
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .select("*")
    .single();
  if (error || !data) throw storeError(error ?? { message: "Could not update category." });
  const category = data as AiCategory;
  void writeActivityLog({
    action: "update",
    entityType: "ai_categories",
    entityId: category.id,
    oldData: previous as unknown as Record<string, unknown> | null,
    newData: category as unknown as Record<string, unknown>,
  });
  return category;
}

export async function deleteCategory(id: string): Promise<void> {
  const previous = await getCategory(id).catch(() => null);
  const { error } = await requireStore()
    .from("ai_categories")
    .delete()
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID);
  if (error) throw storeError(error);
  void writeActivityLog({
    action: "delete",
    entityType: "ai_categories",
    entityId: id,
    oldData: previous as unknown as Record<string, unknown> | null,
  });
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
  "id, organization_id, name, tool_key, description, status, configuration, created_at, updated_at";

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
      row.configuration && typeof row.configuration === "object"
        ? (row.configuration as Record<string, unknown>)
        : row.config && typeof row.config === "object"
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
    .select("ai_agents(id, name)")
    .eq("tool_id", toolId);
  if (error) throw storeError(error);
  const agents: Array<{ id: string; name: string }> = [];
  for (const row of data ?? []) {
    const raw = (row as { ai_agents?: unknown }).ai_agents;
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

/** Toggle a tool's status (active/inactive), scoped to the default org. */
export async function updateToolStatus(
  id: string,
  status: "active" | "inactive",
): Promise<AiToolConfig> {
  const previous = await getTool(id);
  const { data, error } = await requireStore()
    .from("ai_tools")
    .update({ status })
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .select(TOOL_COLUMNS)
    .single();
  if (error || !data) {
    if (!error && !data) {
      throw new AiManagementStoreError("Tool not found.", 404);
    }
    throw storeError(error ?? { message: "Could not update tool." });
  }
  const tool = mapToolRow(data as Record<string, unknown>);
  void writeActivityLog({
    action: "status_change",
    entityType: "ai_tools",
    entityId: tool.id,
    oldData: previous as unknown as Record<string, unknown> | null,
    newData: tool as unknown as Record<string, unknown>,
  });
  return tool;
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
  const previousTools = await _getToolIdsByAgent(agentId).catch(() => []);
  const previousKbs = await listAgentKnowledgeBaseAssignments(agentId).catch(
    () => [],
  );

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
    enabled: true,
  }));
  const kbRows = input.knowledgeBaseIds.map((knowledge_base_id) => ({
    agent_id: agentId,
    knowledge_base_id,
    enabled: true,
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

  void writeActivityLog({
    action: "assign",
    entityType: "ai_agents",
    entityId: agentId,
    oldData: {
      tool_ids: previousTools,
      knowledge_base_ids: previousKbs,
    },
    newData: {
      tool_ids: input.toolIds,
      knowledge_base_ids: input.knowledgeBaseIds,
    },
  });
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
    .insert({
      organization_id: DEFAULT_ORGANIZATION_ID,
      slug: uniqueSlug(input.name),
      ...input,
    })
    .select(KNOWLEDGE_BASE_COLUMNS)
    .single();
  if (error || !data) {
    throw new AiManagementStoreError(
      error?.message ?? "Could not create knowledge base.",
    );
  }
  const kb = data as AiKnowledgeBaseRow;
  void writeActivityLog({
    action: "create",
    entityType: "ai_knowledge_bases",
    entityId: kb.id,
    newData: kb as unknown as Record<string, unknown>,
  });
  return kb;
}

export async function updateKnowledgeBase(
  id: string,
  input: {
    name?: string;
    description?: string;
    status?: "active" | "inactive";
  },
): Promise<AiKnowledgeBaseRow> {
  const previous = await getKnowledgeBase(id).catch(() => null);
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
  const kb = data as AiKnowledgeBaseRow;
  void writeActivityLog({
    action: "update",
    entityType: "ai_knowledge_bases",
    entityId: kb.id,
    oldData: previous as unknown as Record<string, unknown> | null,
    newData: kb as unknown as Record<string, unknown>,
  });
  return kb;
}

export async function deleteKnowledgeBase(id: string): Promise<void> {
  const supabase = requireStore();
  const existing = await getKnowledgeBase(id).catch(() => null);
  if (!existing) throw new AiManagementStoreError("Knowledge base not found.", 404);

  const { data: docs } = await supabase
    .from("ai_documents")
    .select("file_path")
    .eq("knowledge_base_id", id);
  const paths = (docs ?? [])
    .map((row) => (row as { file_path?: string }).file_path)
    .filter((path): path is string => Boolean(path));
  if (paths.length > 0) {
    await supabase.storage.from("agent-documents").remove(paths);
  }

  // Remove document rows before the KB so FK-safe in either direction.
  await supabase
    .from("ai_documents")
    .delete()
    .eq("knowledge_base_id", id);

  const { error } = await supabase
    .from("ai_knowledge_bases")
    .delete()
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID);
  if (error) throw storeError(error);
  void writeActivityLog({
    action: "delete",
    entityType: "ai_knowledge_bases",
    entityId: id,
    oldData: existing as unknown as Record<string, unknown>,
  });
}

export async function listKnowledgeBaseStats(): Promise<
  Record<string, AiKnowledgeBaseStats>
> {
  const supabase = requireStore();
  const [{ data: docData, error: docError }, { data: agentData, error: agentError }] =
    await Promise.all([
      supabase
        .from("ai_documents")
        .select("knowledge_base_id, chunk_count, status"),
      supabase
        .from("ai_agent_knowledge_bases")
        .select("knowledge_base_id"),
    ]);
  if (docError) throw storeError(docError);
  if (agentError) throw storeError(agentError);

  const byKb = new Map<
    string,
    { documentCount: number; readyDocumentCount: number; chunkCount: number; agentCount: number }
  >();
  const ensure = (id: string) => {
    let entry = byKb.get(id);
    if (!entry) {
      entry = { documentCount: 0, readyDocumentCount: 0, chunkCount: 0, agentCount: 0 };
      byKb.set(id, entry);
    }
    return entry;
  };
  for (const row of (docData ?? []) as Array<{
    knowledge_base_id: string | null;
    chunk_count: number | null;
    status?: string;
  }>) {
    if (!row.knowledge_base_id) continue;
    const entry = ensure(row.knowledge_base_id);
    entry.documentCount += 1;
    if (row.status === "indexed") entry.readyDocumentCount += 1;
    entry.chunkCount += typeof row.chunk_count === "number" ? row.chunk_count : 0;
  }
  for (const row of (agentData ?? []) as Array<{ knowledge_base_id: string | null }>) {
    if (!row.knowledge_base_id) continue;
    ensure(row.knowledge_base_id).agentCount += 1;
  }

  const result: Record<string, AiKnowledgeBaseStats> = {};
  for (const [id, stats] of byKb) {
    result[id] = stats;
  }
  return result;
}

export async function getKnowledgeBaseStats(
  id: string,
): Promise<AiKnowledgeBaseStats> {
  const supabase = requireStore();
  const [{ count: documentCount }, chunkQuery, agentQuery] = await Promise.all([
    supabase
      .from("ai_documents")
      .select("id", { count: "exact", head: true })
      .eq("knowledge_base_id", id),
    supabase
      .from("ai_documents")
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
  const readyDocumentCount = (chunkQuery.data ?? []).filter((row) => {
    const status = (row as { status?: string }).status;
    return status === "indexed";
  }).length;
  return {
    documentCount: documentCount ?? 0,
    chunkCount,
    agentCount: agentQuery.count ?? 0,
    readyDocumentCount,
  };
}

// ── Settings (key/value ai_settings) ────────────────────────────────────

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

const SETTING_KEYS = [
  "default_model",
  "default_temperature",
  "default_top_k",
  "similarity_threshold",
  "memory_enabled",
  "elevenlabs_api_key",
] as const;

async function loadSettingsMap(): Promise<Map<string, unknown>> {
  const { data, error } = await requireStore()
    .from("ai_settings")
    .select("key, value")
    .in("key", [...SETTING_KEYS]);
  if (error) throw storeError(error);
  const map = new Map<string, unknown>();
  for (const row of data ?? []) {
    const key = String((row as { key?: string }).key ?? "");
    if (!key) continue;
    map.set(key, (row as { value?: unknown }).value);
  }
  return map;
}

function readTyped<T>(
  map: Map<string, unknown>,
  key: string,
  fallback: T,
): T {
  const raw = map.get(key);
  if (raw === undefined || raw === null) return fallback;
  if (typeof fallback === "number") {
    const n = typeof raw === "number" ? raw : Number(raw);
    return (Number.isFinite(n) ? n : fallback) as T;
  }
  if (typeof fallback === "boolean") {
    if (typeof raw === "boolean") return raw as T;
    if (raw === "true") return true as T;
    if (raw === "false") return false as T;
    return fallback;
  }
  return (typeof raw === "string" ? raw : String(raw)) as T;
}

async function upsertSetting(
  key: string,
  value: unknown,
  description = "",
): Promise<void> {
  const { error } = await requireStore()
    .from("ai_settings")
    .upsert({ key, value, description }, { onConflict: "key" });
  if (error) throw storeError(error);
}

export async function getAISettings(): Promise<
  AiSettings & {
    elevenlabs_configured: boolean;
    elevenlabs_source: "env" | "database" | "not_configured";
  }
> {
  const map = await loadSettingsMap();
  const envKey = process.env.ELEVENLABS_API_KEY?.trim() ?? "";
  const dbKeyRaw = map.get("elevenlabs_api_key");
  const elevenlabs_key =
    typeof dbKeyRaw === "string"
      ? dbKeyRaw
      : dbKeyRaw != null
        ? String(dbKeyRaw)
        : "";
  const elevenlabs_source = envKey.startsWith("sk_")
    ? ("env" as const)
    : elevenlabs_key.startsWith("sk_")
      ? ("database" as const)
      : ("not_configured" as const);

  return {
    default_model: readTyped(map, "default_model", SETTING_DEFAULTS.default_model),
    default_temperature: readTyped(
      map,
      "default_temperature",
      SETTING_DEFAULTS.default_temperature,
    ),
    default_top_k: readTyped(map, "default_top_k", SETTING_DEFAULTS.default_top_k),
    similarity_threshold: readTyped(
      map,
      "similarity_threshold",
      SETTING_DEFAULTS.similarity_threshold,
    ),
    memory_enabled: readTyped(
      map,
      "memory_enabled",
      SETTING_DEFAULTS.memory_enabled,
    ),
    elevenlabs_configured: elevenlabs_source !== "not_configured",
    elevenlabs_source,
  };
}

export async function updateAISettings(
  input: Partial<AiSettings> & {
    elevenlabs_api_key?: string | null;
  },
): Promise<
  AiSettings & {
    elevenlabs_configured: boolean;
    elevenlabs_source: "env" | "database" | "not_configured";
  }
> {
  const current = await getAISettings();
  const next: AiSettings = {
    default_model: input.default_model ?? current.default_model,
    default_temperature:
      input.default_temperature ?? current.default_temperature,
    default_top_k: input.default_top_k ?? current.default_top_k,
    similarity_threshold:
      input.similarity_threshold ?? current.similarity_threshold,
    memory_enabled: input.memory_enabled ?? current.memory_enabled,
  };

  await Promise.all([
    upsertSetting("default_model", next.default_model, "Default LLM model"),
    upsertSetting(
      "default_temperature",
      next.default_temperature,
      "Default sampling temperature",
    ),
    upsertSetting("default_top_k", next.default_top_k, "Default RAG top-k"),
    upsertSetting(
      "similarity_threshold",
      next.similarity_threshold,
      "Default RAG similarity threshold",
    ),
    upsertSetting(
      "memory_enabled",
      next.memory_enabled,
      "Global memory feature flag",
    ),
  ]);

  if ("elevenlabs_api_key" in input) {
    const key = input.elevenlabs_api_key?.trim() ?? "";
    if (!key) {
      await requireStore()
        .from("ai_settings")
        .delete()
        .eq("key", "elevenlabs_api_key");
    } else {
      await upsertSetting(
        "elevenlabs_api_key",
        key,
        "ElevenLabs API key (server-side only)",
      );
    }
  }

  const updated = await getAISettings();
  void writeActivityLog({
    action: "configure",
    entityType: "ai_settings",
    entityId: null,
    oldData: {
      default_model: current.default_model,
      default_temperature: current.default_temperature,
      default_top_k: current.default_top_k,
      similarity_threshold: current.similarity_threshold,
      memory_enabled: current.memory_enabled,
    },
    newData: {
      default_model: updated.default_model,
      default_temperature: updated.default_temperature,
      default_top_k: updated.default_top_k,
      similarity_threshold: updated.similarity_threshold,
      memory_enabled: updated.memory_enabled,
    },
  });
  return updated;
}

/**
 * Server-side only. Used by the ElevenLabs validation routes and never returned
 * to the browser. Env var takes precedence over the stored value.
 */
export async function getElevenLabsApiKey(): Promise<string> {
  const envKey = process.env.ELEVENLABS_API_KEY?.trim() ?? "";
  if (envKey.startsWith("sk_")) return envKey;
  const { data } = await requireStore()
    .from("ai_settings")
    .select("value")
    .eq("key", "elevenlabs_api_key")
    .maybeSingle();
  const value = (data as { value?: unknown } | null)?.value;
  const key =
    typeof value === "string" ? value : value != null ? String(value) : "";
  return key.startsWith("sk_") ? key : "";
}
