import { NextResponse } from "next/server";
import { deleteAgent, getAgent, updateAgent } from "@/lib/agents/store";
import { isUuid, validateAgentPatch } from "@/lib/agents/schema";
import { listAgentVoices, replaceAgentVoices } from "@/lib/agents/voices";
import { invalidateAgentRuntimeCache } from "@/lib/server/internal";
import { syncAgentAssignments } from "@/lib/ai-management/store";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonError("Invalid agent id.", 400);
  }

  try {
    const agent = await getAgent(id);
    if (!agent) {
      return jsonError("Agent not found.", 404);
    }
    const voices = await listAgentVoices(id);
    return NextResponse.json({ agent: { ...agent, voices } });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonError("Invalid agent id.", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const parsed = validateAgentPatch(body);
  if (!parsed.ok) {
    return jsonError("Please fix the highlighted fields.", 422, parsed.errors);
  }

  try {
    const agent = await updateAgent(id, parsed.data);

    // Persist the relational tool + knowledge-base assignments when the config
    // carries them (the agent form always mirrors both sources of truth).
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
      if (Array.isArray(configuration.tools) || Array.isArray(configuration.knowledge_base_ids)) {
        await syncAgentAssignments(id, { toolIds, knowledgeBaseIds });
      }
    }

    let voices = await listAgentVoices(id);
    if (parsed.data.voices) {
      voices = await replaceAgentVoices(id, parsed.data.voices);
      await invalidateAgentRuntimeCache(id);
    }

    return NextResponse.json({ agent: { ...agent, voices } });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonError("Invalid agent id.", 400);
  }

  try {
    await deleteAgent(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return storeErrorResponse(error);
  }
}
