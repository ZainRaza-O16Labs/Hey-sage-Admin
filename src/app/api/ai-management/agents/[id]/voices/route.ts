import { NextResponse } from "next/server";
import { getAgent } from "@/lib/agents/store";
import { isUuid } from "@/lib/agents/schema";
import {
  deleteAgentVoice,
  listAgentVoices,
  replaceAgentVoices,
  setDefaultAgentVoice,
} from "@/lib/agents/voices";
import { invalidateAgentRuntimeCache } from "@/lib/server/internal";
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
  if (!isUuid(id)) return jsonError("Invalid agent id.", 400);

  try {
    const agent = await getAgent(id);
    if (!agent) return jsonError("Agent not found.", 404);
    const voices = await listAgentVoices(id);
    return NextResponse.json({ voices });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid agent id.", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const source =
    body && typeof body === "object"
      ? (body as { voices?: unknown })
      : null;
  if (!source || !Array.isArray(source.voices)) {
    return jsonError("Expected { voices: [...] }.", 400);
  }

  try {
    const agent = await getAgent(id);
    if (!agent) return jsonError("Agent not found.", 404);
    const voices = await replaceAgentVoices(
      id,
      source.voices as Parameters<typeof replaceAgentVoices>[1],
    );
    await invalidateAgentRuntimeCache(id);
    return NextResponse.json({ voices });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid agent id.", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const source =
    body && typeof body === "object"
      ? (body as { defaultVoiceId?: unknown; deleteVoiceId?: unknown })
      : null;

  try {
    const agent = await getAgent(id);
    if (!agent) return jsonError("Agent not found.", 404);

    if (typeof source?.deleteVoiceId === "string" && source.deleteVoiceId) {
      const voices = await deleteAgentVoice(id, source.deleteVoiceId);
      await invalidateAgentRuntimeCache(id);
      return NextResponse.json({ voices });
    }

    if (typeof source?.defaultVoiceId === "string" && source.defaultVoiceId) {
      const voices = await setDefaultAgentVoice(id, source.defaultVoiceId);
      await invalidateAgentRuntimeCache(id);
      return NextResponse.json({ voices });
    }

    return jsonError("Provide defaultVoiceId or deleteVoiceId.", 400);
  } catch (error) {
    return storeErrorResponse(error);
  }
}
