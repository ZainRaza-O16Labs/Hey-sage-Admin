import { NextResponse } from "next/server";
import { createAgent, listAgents } from "@/lib/agents/store";
import { getAgentDocumentCounts } from "@/lib/agents/documents";
import { validateAgentInput } from "@/lib/agents/schema";
import { listAgentVoices, replaceAgentVoices } from "@/lib/agents/voices";
import { syncAgentAssignments } from "@/lib/ai-management/store";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const agents = await listAgents();
    const documentCounts: Record<string, number> =
      await getAgentDocumentCounts().catch(
        () => ({}) as Record<string, number>,
      );
    return NextResponse.json({
      agents: agents.map((agent) => ({
        ...agent,
        documentCount: documentCounts[agent.id] ?? 0,
      })),
    });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const parsed = validateAgentInput(body);
  if (!parsed.ok) {
    return jsonError("Please fix the highlighted fields.", 422, parsed.errors);
  }

  try {
    const agent = await createAgent(parsed.data);

    // Persist the relational tool + knowledge-base assignments when the config
    // carries them, mirroring the PATCH route (the agent form always mirrors
    // both sources of truth).
    const configuration = parsed.data.configuration;
    if (configuration && typeof configuration === "object") {
      const toolIds = Array.isArray(configuration.tools)
        ? configuration.tools.filter((t): t is string => typeof t === "string")
        : [];
      const knowledgeBaseIds = Array.isArray(configuration.knowledge_base_ids)
        ? configuration.knowledge_base_ids.filter(
            (id): id is string => typeof id === "string",
          )
        : [];
      if (
        Array.isArray(configuration.tools) ||
        Array.isArray(configuration.knowledge_base_ids)
      ) {
        await syncAgentAssignments(agent.id, { toolIds, knowledgeBaseIds });
      }
    }

    let voices = [] as Awaited<ReturnType<typeof listAgentVoices>>;
    if (parsed.data.voices?.length) {
      voices = await replaceAgentVoices(agent.id, parsed.data.voices);
    } else if (parsed.data.voice_id) {
      voices = await replaceAgentVoices(agent.id, [
        {
          voice_id: parsed.data.voice_id,
          voice_name: parsed.data.voice_name ?? null,
          verified: true,
          is_default: true,
        },
      ]);
    } else {
      voices = await listAgentVoices(agent.id);
    }
    return NextResponse.json({ agent: { ...agent, voices } }, { status: 201 });
  } catch (error) {
    return storeErrorResponse(error);
  }
}
