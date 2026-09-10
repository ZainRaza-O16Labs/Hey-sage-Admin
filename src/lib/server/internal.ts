import { AgentsStoreError } from "@/lib/agents/store";

/** Public Mastra application backend (gateway). */
function getMastraUrl() {
  const explicit =
    process.env.MASTRA_SERVER_URL?.trim() ||
    process.env.SERVER_URL?.trim() ||
    "";
  if (explicit) return explicit.replace(/\/$/, "");
  return "http://127.0.0.1:4111";
}

function getInternalSecret() {
  return (
    process.env.INTERNAL_API_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

export async function enqueueBackendJob(path: string) {
  const secret = getInternalSecret();
  if (!secret) {
    throw new AgentsStoreError(
      "INTERNAL_API_SECRET is not configured.",
      503,
    );
  }

  let response: Response;
  try {
    response = await fetch(`${getMastraUrl()}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new AgentsStoreError(
      "Mastra is not running. Start it with npm run dev:all.",
      503,
    );
  }

  if (response.status === 202) return;

  let message = "Mastra could not accept this job.";
  try {
    const payload = (await response.json()) as { error?: string };
    if (payload.error) message = payload.error;
  } catch {
    // Keep the default message.
  }
  throw new AgentsStoreError(message, response.status);
}

export function enqueueDocumentProcess(agentId: string, documentId: string) {
  return enqueueBackendJob(
    `/internal/agents/${agentId}/documents/${documentId}/process`,
  );
}

export function enqueueKnowledgeBaseDocumentProcess(
  knowledgeBaseId: string,
  documentId: string,
) {
  return enqueueBackendJob(
    `/internal/knowledge-bases/${knowledgeBaseId}/documents/${documentId}/process`,
  );
}

/** Best-effort runtime refresh after admin changes an agent's voice catalog. */
export async function invalidateAgentRuntimeCache(
  agentId: string,
): Promise<boolean> {
  const secret = getInternalSecret();
  if (!secret) return false;

  try {
    const response = await fetch(
      `${getMastraUrl()}/internal/agents/${agentId}/cache/invalidate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.status === 202 || response.ok) return true;
  } catch {
    // Runtime not reachable — the 5-minute TTL will self-heal.
  }
  return false;
}

/**
 * Run a live chat against an agent in any lifecycle state (Draft/Unpublished/
 * Published) through the real runtime — no conversation persistence.
 */
export async function testAgentChat(
  agentId: string,
  message: string,
): Promise<{ reply: string; toolCalls: BackendToolCall[] }> {
  const secret = getInternalSecret();
  if (!secret) {
    throw new AgentsStoreError(
      "INTERNAL_API_SECRET is not configured.",
      503,
    );
  }

  let response: Response;
  try {
    response = await fetch(
      `${getMastraUrl()}/internal/agents/${agentId}/chat/test`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(120_000),
      },
    );
  } catch {
    throw new AgentsStoreError(
      "Mastra is not running. Start it with npm run dev:all.",
      503,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as {
    reply?: string;
    error?: string;
    toolCalls?: unknown[];
  };
  if (!response.ok) {
    throw new AgentsStoreError(
      payload.error ?? "Agent test chat failed.",
      response.status,
    );
  }
  if (typeof payload.reply !== "string" || !payload.reply) {
    throw new AgentsStoreError("Agent returned an empty response.", 502);
  }
  return {
    reply: payload.reply,
    toolCalls: (payload.toolCalls ?? []).filter(isBackendToolCall),
  };
}

/**
 * Production Playground chat via the public gateway chat path.
 * Persists ai_conversations / ai_messages / ai_execution_logs.
 * Optional agentId: when omitted, Parent/Router selects the permanent agent.
 */
export async function productionChat(input: {
  message: string;
  agentId?: string | null;
  conversationId?: string | null;
  userId?: string | null;
}): Promise<{
  reply: string;
  conversationId: string;
  agentId: string;
  categoryId: string | null;
  toolCalls: BackendToolCall[];
  timings: {
    requestStart?: number;
    authMs?: number | null;
    routingMs: number | null;
    agentResolveMs: number | null;
    conversationLookupMs?: number | null;
    conversationCreateMs?: number | null;
    conversationHistoryMs?: number | null;
    ragEmbeddingMs?: number | null;
    ragVectorMs?: number | null;
    ragTotalMs?: number | null;
    ragRan?: boolean | null;
    needsCompanyKnowledge?: boolean | null;
    toolLookupMs?: number | null;
    toolExecutionMs?: number | null;
    llmFirstTokenMs?: number | null;
    llmTotalMs: number | null;
    memoryMs?: number | null;
    persistMs?: number | null;
    totalMs: number;
    otherMs?: number | null;
  };
}> {
  const message = input.message.trim();
  if (!message) {
    throw new AgentsStoreError("Message is required.", 400);
  }

  let response: Response;
  try {
    response = await fetch(`${getMastraUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        agent_id: input.agentId?.trim() || undefined,
        conversation_id: input.conversationId?.trim() || undefined,
        user_id: input.userId?.trim() || undefined,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new AgentsStoreError(
      "Mastra is not running. Start it with npm run dev:all.",
      503,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as {
    reply?: string;
    error?: string;
    conversation_id?: string;
    agent_id?: string;
    category_id?: string | null;
    toolCalls?: unknown[];
    timings?: Record<string, unknown>;
  };

  if (!response.ok) {
    throw new AgentsStoreError(
      payload.error ?? "Chat request failed.",
      response.status >= 400 && response.status < 600 ? response.status : 502,
    );
  }
  if (typeof payload.reply !== "string" || !payload.reply.trim()) {
    throw new AgentsStoreError("Agent returned an empty response.", 502);
  }
  if (typeof payload.conversation_id !== "string" || !payload.conversation_id) {
    throw new AgentsStoreError("Chat did not return a conversation id.", 502);
  }

  const rawTimings = (payload.timings ?? {}) as Record<string, unknown>;
  const num = (key: string): number | null => {
    const v = rawTimings[key];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  const bool = (key: string): boolean | null => {
    const v = rawTimings[key];
    return typeof v === "boolean" ? v : null;
  };

  return {
    reply: payload.reply,
    conversationId: payload.conversation_id,
    agentId: typeof payload.agent_id === "string" ? payload.agent_id : "",
    categoryId:
      typeof payload.category_id === "string" ? payload.category_id : null,
    toolCalls: (payload.toolCalls ?? []).filter(isBackendToolCall),
    timings: {
      requestStart: num("requestStart") ?? Date.now(),
      authMs: num("authMs"),
      routingMs: num("routingMs"),
      agentResolveMs: num("agentResolveMs"),
      conversationLookupMs: num("conversationLookupMs"),
      conversationCreateMs: num("conversationCreateMs"),
      conversationHistoryMs: num("conversationHistoryMs"),
      ragEmbeddingMs: num("ragEmbeddingMs"),
      ragVectorMs: num("ragVectorMs"),
      ragTotalMs: num("ragTotalMs"),
      ragRan: bool("ragRan"),
      needsCompanyKnowledge: bool("needsCompanyKnowledge"),
      toolLookupMs: num("toolLookupMs"),
      toolExecutionMs: num("toolExecutionMs"),
      llmFirstTokenMs: num("llmFirstTokenMs"),
      llmTotalMs: num("llmTotalMs"),
      memoryMs: num("memoryMs"),
      persistMs: num("persistMs"),
      totalMs: num("totalMs") ?? 0,
      otherMs: num("otherMs"),
    },
  };
}

/**
 * Production Playground chat via the public gateway chat path with streaming.
 * Requests SSE from the gateway and returns a passthrough Response whose body
 * is the gateway's `text/event-stream`. The final `done` payload carries the
 * same shape as `productionChat` (including gateway timings); authMs is merged
 * into the stream by the API route proxy.
 */
export async function productionChatStream(input: {
  message: string;
  agentId?: string | null;
  conversationId?: string | null;
  userId?: string | null;
  signal?: AbortSignal;
}): Promise<Response> {
  const message = input.message.trim();
  if (!message) {
    throw new AgentsStoreError("Message is required.", 400);
  }

  let response: Response;
  try {
    response = await fetch(`${getMastraUrl()}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        message,
        agent_id: input.agentId?.trim() || undefined,
        conversation_id: input.conversationId?.trim() || undefined,
        user_id: input.userId?.trim() || undefined,
        stream: true,
      }),
      signal: input.signal
        ? AbortSignal.any([input.signal, AbortSignal.timeout(120_000)])
        : AbortSignal.timeout(120_000),
    });
  } catch {
    throw new AgentsStoreError(
      "Mastra is not running. Start it with npm run dev:all.",
      503,
    );
  }

  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new AgentsStoreError(
      payload.error ?? "Chat request failed.",
      response.status >= 400 && response.status < 600 ? response.status : 502,
    );
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export type BackendToolCall = {
  name: string;
  args: Record<string, unknown>;
  status: "success" | "error";
  result?: unknown;
  errorMessage?: string;
};

function isBackendToolCall(value: unknown): value is BackendToolCall {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.name === "string" &&
    record.args !== null &&
    typeof record.args === "object" &&
    (record.status === "success" || record.status === "error")
  );
}
