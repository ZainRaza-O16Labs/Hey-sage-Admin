import { NextResponse } from "next/server";
import { getAgent } from "@/lib/agents/store";
import { getElevenLabsApiKey } from "@/lib/ai-management/store";
import { isUuid } from "@/lib/agents/schema";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Validates that a voice id exists on the active ElevenLabs account. The voice
 * id is never exposed — only whether it is valid on the configured account.
 */
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid agent id.", 400);

  try {
    const agent = await getAgent(id);
    if (!agent) return jsonError("Agent not found.", 404);
    const voiceId = agent.voice_id?.trim() ?? "";
    if (!voiceId) {
      return jsonError("This agent has no voice id set.", 400);
    }

    const apiKey = await getElevenLabsApiKey();
    if (!apiKey) {
      return jsonError(
        "No ElevenLabs API key configured. Add it in Settings or set ELEVENLABS_API_KEY.",
        400,
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`,
      { headers: { "xi-api-key": apiKey }, signal: AbortSignal.timeout(15_000) },
    );
    if (response.ok) {
      return NextResponse.json({ ok: true, voiceId });
    }
    return NextResponse.json(
      {
        ok: false,
        detail: `Voice not found on the ElevenLabs account (HTTP ${response.status}).`,
      },
      { status: 400 },
    );
  } catch (error) {
    return storeErrorResponse(error);
  }
}