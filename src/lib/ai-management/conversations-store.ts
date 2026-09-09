import {
  AiManagementStoreError,
  requireStore,
} from "@/lib/ai-management/store";

export type AiConversationRecord = {
  id: string;
  organization_id: string;
  user_id: string | null;
  session_id: string | null;
  agent_id: string;
  agent_name: string | null;
  category_name: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
};

export type AiConversationMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
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
    .from("conversations")
    .select(
      "id, organization_id, user_id, session_id, agent_id, created_at, updated_at, agents(name, category_id, ai_categories(name))",
    )
    .eq("organization_id", input.organizationId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`user_id.ilike.%${search}%,session_id.ilike.%${search}%`);
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
    .from("conversation_messages")
    .select("conversation_id");
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
  const agent = firstObject(row.agents);
  const category = firstObject(agent?.ai_categories);
  return {
    id: String(row.id),
    organization_id: String(
      row.organization_id ?? "a0000000-0000-4000-8000-000000000001",
    ),
    user_id: typeof row.user_id === "string" ? row.user_id : null,
    session_id: typeof row.session_id === "string" ? row.session_id : null,
    agent_id: String(row.agent_id ?? ""),
    agent_name: typeof agent?.name === "string" ? agent.name : null,
    category_name: typeof category?.name === "string" ? category.name : null,
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
    .from("conversations")
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
 * Count backend tool-call executions for an organization (real runtime
 * telemetry persisted to conversation_tool_calls). Returns null when the
 * telemetry table is not yet installed so callers can show an honest "no
 * telemetry" state instead of a fabricated zero.
 */
export async function countToolCalls(
  organizationId: string,
  sinceIso?: string,
): Promise<number | null> {
  const supabase = requireStore();
  let query = supabase
    .from("conversation_tool_calls")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
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
    .from("conversations")
    .select(
      "id, organization_id, user_id, session_id, agent_id, created_at, updated_at, agents(name, category_id, ai_categories(name))",
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

export async function listConversationMessages(
  conversationId: string,
  limit = 200,
): Promise<AiConversationMessage[]> {
  const supabase = requireStore();
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("id, conversation_id, role, content, created_at")
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
    role: row.role === "assistant" ? "assistant" : "user",
    content: String(row.content ?? ""),
    created_at: String(row.created_at ?? ""),
  }));
}

export type AiConversationToolCall = {
  id: string;
  organization_id: string;
  conversation_id: string;
  agent_id: string | null;
  tool_key: string;
  tool_name: string;
  input: Record<string, unknown>;
  status: "success" | "error";
  output: unknown | null;
  error_message: string | null;
  created_at: string;
};

/**
 * List real tool-call telemetry for a conversation. Best-effort: returns an
 * empty array (not an error) when the telemetry table is not installed, so the
 * detail page can show an honest "no telemetry" state.
 */
export async function listConversationToolCalls(
  conversationId: string,
  limit = 100,
): Promise<AiConversationToolCall[]> {
  const supabase = requireStore();
  const { data, error } = await supabase
    .from("conversation_tool_calls")
    .select(
      "id, organization_id, conversation_id, agent_id, tool_key, tool_name, input, status, output, error_message, created_at",
    )
    .eq("conversation_id", conversationId)
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
  return (data ?? []).map((row) => ({
    id: String(row.id),
    organization_id: String(row.organization_id ?? ""),
    conversation_id: String(row.conversation_id ?? ""),
    agent_id: typeof row.agent_id === "string" ? row.agent_id : null,
    tool_key: String(row.tool_key ?? ""),
    tool_name: String(row.tool_name ?? ""),
    input: (row.input && typeof row.input === "object")
      ? (row.input as Record<string, unknown>)
      : {},
    status: row.status === "error" ? "error" : "success",
    output: row.output ?? null,
    error_message: typeof row.error_message === "string" ? row.error_message : null,
    created_at: String(row.created_at ?? ""),
  }));
}

export async function deleteConversation(
  organizationId: string,
  id: string,
): Promise<void> {
  const supabase = requireStore();
  const { data, error } = await supabase
    .from("conversation_messages")
    .delete()
    .eq("conversation_id", id)
    .select("id");
  if (error) {
    if (isMissingRelation(error.message)) throw unsupportedMessages();
    throw new AiManagementStoreError(error.message);
  }
  const { error: convError, data: deleted } = await supabase
    .from("conversations")
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
