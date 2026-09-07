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

/**
 * Run a live chat against an agent in any lifecycle state (Draft/Unpublished/
 * Published) through the real runtime — no conversation persistence.
 */
export async function testAgentChat(
  agentId: string,
  message: string,
): Promise<string> {
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
  return payload.reply;
}
