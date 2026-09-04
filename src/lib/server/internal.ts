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
