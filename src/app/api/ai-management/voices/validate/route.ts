import { NextResponse } from "next/server";
import { getElevenLabsApiKey } from "@/lib/ai-management/store";
import { requireApiUser, storeErrorResponse } from "@/lib/api/respond";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json().catch(() => null)) as {
      voiceId?: unknown;
    } | null;
    const voiceId =
      typeof body?.voiceId === "string" ? body.voiceId.trim() : "";
    if (!voiceId) {
      return NextResponse.json({
        ok: false,
        code: "invalid",
        detail: "Voice ID could not be verified.",
      });
    }

    const apiKey = await getElevenLabsApiKey();
    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        code: "key_missing",
        detail: "Global ElevenLabs API Key Missing.",
      });
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`,
        {
          headers: { "xi-api-key": apiKey },
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (response.ok) {
        return NextResponse.json({ ok: true, voiceId });
      }
      return NextResponse.json({
        ok: false,
        code: "invalid",
        detail: "Voice ID could not be verified.",
      });
    } catch {
      return NextResponse.json({
        ok: false,
        code: "api_error",
        detail: "Could not reach the ElevenLabs API. Please try again.",
      });
    }
  } catch (error) {
    return storeErrorResponse(error);
  }
}