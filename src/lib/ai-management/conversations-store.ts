import {
  AiManagementStoreError,
  requireStore,
  DEFAULT_ORGANIZATION_ID,
} from "@/lib/ai-management/store";

export type AiConversationRecord = {
  id: string;
  organization_id: string;
  user_id: string | null;
  session_id: string | null;
  agent_id: string;
  agent_name: string | null;
  category_name: string | null;
  title: string | null;
  status: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
};

export type AiConversationMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

function unsupportedMessages(): AiManagementStoreError {
  return new AiManagementStoreError(
    "Conversation tables are not installed. Run the Supabase migrations in order.",
    503,
  );
}

function isMissingRelation(message: string) {
  return /could not find the table|relation .* does not exist|schema cache/i.test(
    message,
  );
}

export async function listConversations(input: {
  organizationId: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<AiConversationRecord[]> {
  const supabase = requireStore();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const search = input.query?.trim() ?? "";

  let query = supabase
    .from("ai_conversations")
    .select(
      "id, organization_id, user_id, session_id, agent_id, title, status, created_at, updated_at, ai_agents(name, category_id, ai_categories(name))",
    )
    .eq("organization_id", input.organizationId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `session_id.ilike.%${search}%,title.ilike.%${search}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingRelation(error.message)) throw unsupportedMessages();
    throw new AiManagementStoreError(error.message);
  }

  const messageCounts = await loadMessageCounts(
    (data ?? []).map((row) => String((row as { id?: string }).id ?? "")),
  );

  return (data ?? []).map((row) =>
    mapConversation(row as Record<string, unknown>, messageCounts),
  );
}

async function loadMessageCounts(conversationIds: string[]): Promise<
  Map<string, number>
> {
  const counts = new Map<string, number>();
  if (conversationIds.length === 0) return counts;
  const supabase = requireStore();
  const { data, error } = await supabase
    .from("ai_messages")
    .select("conversation_id")
    .in("conversation_id", conversationIds);
  if (error) {
    if (isMissingRelation(error.message)) throw unsupportedMessages();
    throw new AiManagementStoreError(error.message);
  }
  for (const row of data ?? []) {
    const cid = String((row as { conversation_id?: string }).conversation_id ?? "");
    counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }
  return counts;
}

function firstObject(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return value.length > 0 && typeof value[0] === "object"
      ? (value[0] as Record<string, unknown>)
      : null;
  }
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function mapConversation(
  row: Record<string, unknown>,
  counts: Map<string, number>,
): AiConversationRecord {
  const agent = firstObject(row.ai_agents) ?? firstObject(row.agents);
  const category = firstObject(agent?.ai_categories);
  return {
    id: String(row.id),
    organization_id: String(
      row.organization_id ?? DEFAULT_ORGANIZATION_ID,
    ),
    user_id: typeof row.user_id === "string" ? row.user_id : null,
    session_id: typeof row.session_id === "string" ? row.session_id : null,
    agent_id: String(row.agent_id ?? ""),
    agent_name: typeof agent?.name === "string" ? agent.name : null,
    category_name: typeof category?.name === "string" ? category.name : null,
    title: typeof row.title === "string" ? row.title : null,
    status: typeof row.status === "string" ? row.status : null,
    message_count: counts.get(String(row.id)) ?? 0,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function countConversationsSince(
  organizationId: string,
  sinceIso: string,
): Promise<number> {
  const supabase = requireStore();
  const { count, error } = await supabase
    .from("ai_conversations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("created_at", sinceIso);
  if (error) {
    if (isMissingRelation(error.message)) throw unsupportedMessages();
    throw new AiManagementStoreError(error.message);
  }
  return count ?? 0;
}

/**
 * Count tool executions via ai_execution_logs. Scope logs have no
 * organization_id — join through conversations for org filtering.
 */
export async function countToolCalls(
  organizationId: string,
  sinceIso?: string,
): Promise<number | null> {
  const supabase = requireStore();
  let convQuery = supabase
    .from("ai_conversations")
    .select("id")
    .eq("organization_id", organizationId);
  if (sinceIso) {
    // still count all tool calls for those conversations; filter logs by time below
  }
  const { data: conversations, error: convError } = await convQuery;
  if (convError) {
    if (isMissingRelation(convError.message)) return null;
    throw new AiManagementStoreError(convError.message);
  }
  const ids = (conversations ?? []).map((row) =>
    String((row as { id?: string }).id ?? ""),
  ).filter(Boolean);
  if (ids.length === 0) return 0;

  let query = supabase
    .from("ai_execution_logs")
    .select("id", { count: "exact", head: true })
    .eq("execution_type", "tool")
    .in("conversation_id", ids);
  if (sinceIso) {
    query = query.gte("created_at", sinceIso);
  }
  const { count, error } = await query;
  if (error) {
    if (
      /could not find the table|relation .* does not exist|schema cache/i.test(
        error.message,
      )
    ) {
      return null;
    }
    throw new AiManagementStoreError(error.message);
  }
  return count ?? 0;
}

export async function getConversation(
  organizationId: string,
  id: string,
): Promise<AiConversationRecord | null> {
  const supabase = requireStore();
  const { data, error } = await supabase
    .from("ai_conversations")
    .select(
      "id, organization_id, user_id, session_id, agent_id, title, status, created_at, updated_at, ai_agents(name, category_id, ai_categories(name))",
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) {
    if (isMissingRelation(error.message)) throw unsupportedMessages();
    throw new AiManagementStoreError(error.message);
  }
  if (!data) return null;
  const counts = await loadMessageCounts([id]);
  return mapConversation(data as Record<string, unknown>, counts);
}

function normalizeRole(role: unknown): AiConversationMessage["role"] {
  if (role === "assistant" || role === "system" || role === "tool") return role;
  return "user";
}

export async function listConversationMessages(
  conversationId: string,
  limit = 200,
): Promise<AiConversationMessage[]> {
  const supabase = requireStore();
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, conversation_id, role, content, metadata, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    if (isMissingRelation(error.message)) throw unsupportedMessages();
    throw new AiManagementStoreError(error.message);
  }
  return (data ?? []).map((row) => ({
    id: String(row.id),
    conversation_id: String(row.conversation_id),
    role: normalizeRole(row.role),
    content: String(row.content ?? ""),
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: String(row.created_at ?? ""),
  }));
}

export type AiConversationToolCall = {
  id: string;
  conversation_id: string;
  agent_id: string | null;
  tool_id: string | null;
  tool_key: string;
  tool_name: string;
  input: Record<string, unknown>;
  status: "success" | "error" | "running";
  output: unknown | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
};

/**
 * List tool-call telemetry for a conversation from ai_execution_logs.
 */
export async function listConversationToolCalls(
  conversationId: string,
  limit = 100,
): Promise<AiConversationToolCall[]> {
  const supabase = requireStore();
  const { data, error } = await supabase
    .from("ai_execution_logs")
    .select(
      "id, conversation_id, agent_id, tool_id, execution_type, input, status, output, error, duration_ms, created_at, ai_tools(tool_key, name)",
    )
    .eq("conversation_id", conversationId)
    .eq("execution_type", "tool")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 500));
  if (error) {
    if (
      /could not find the table|relation .* does not exist|schema cache/i.test(
        error.message,
      )
    ) {
      return [];
    }
    throw new AiManagementStoreError(error.message);
  }
  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const tool = firstObject(record.ai_tools);
    const input =
      record.input && typeof record.input === "object"
        ? (record.input as Record<string, unknown>)
        : {};
    const toolKey =
      typeof tool?.tool_key === "string"
        ? tool.tool_key
        : typeof input.tool_key === "string"
          ? String(input.tool_key)
          : "";
    const toolName =
      typeof tool?.name === "string"
        ? tool.name
        : typeof input.tool_name === "string"
          ? String(input.tool_name)
          : toolKey;
    return {
      id: String(record.id),
      conversation_id: String(record.conversation_id ?? ""),
      agent_id: typeof record.agent_id === "string" ? record.agent_id : null,
      tool_id: typeof record.tool_id === "string" ? record.tool_id : null,
      tool_key: toolKey,
      tool_name: toolName,
      input,
      status:
        record.status === "error"
          ? "error"
          : record.status === "running"
            ? "running"
            : "success",
      output: record.output ?? null,
      error_message: typeof record.error === "string" ? record.error : null,
      duration_ms:
        typeof record.duration_ms === "number" ? record.duration_ms : null,
      created_at: String(record.created_at ?? ""),
    };
  });
}

export async function deleteConversation(
  organizationId: string,
  id: string,
): Promise<void> {
  const supabase = requireStore();
  const { error } = await supabase
    .from("ai_messages")
    .delete()
    .eq("conversation_id", id);
  if (error) {
    if (isMissingRelation(error.message)) throw unsupportedMessages();
    throw new AiManagementStoreError(error.message);
  }
  const { error: convError, data: deleted } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();
  if (convError) {
    if (isMissingRelation(convError.message)) throw unsupportedMessages();
    throw new AiManagementStoreError(convError.message);
  }
  if (!deleted) {
    throw new AiManagementStoreError("Conversation not found.", 404);
  }
}
