import { NextResponse } from "next/server";
import { getElevenLabsApiKey } from "@/lib/ai-management/store";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

async function validateKey(apiKey: string): Promise<{
  ok: boolean;
  detail?: string;
  subscription?: string;
}> {
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) {
      const payload = (await response.json()) as { subscription?: { tier?: string } };
      return {
        ok: true,
        subscription: payload.subscription?.tier ?? "active",
      };
    }
    const detail = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    return {
      ok: false,
      detail: detail?.detail ?? `ElevenLabs rejected the key (HTTP ${response.status}).`,
    };
  } catch {
    return { ok: false, detail: "Could not reach the ElevenLabs API." };
  }
}

export async function POST() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const apiKey = await getElevenLabsApiKey();
    if (!apiKey) {
      return jsonError(
        "No ElevenLabs API key configured. Add it in Settings or set ELEVENLABS_API_KEY.",
        400,
      );
    }
    const result = await validateKey(apiKey);
    return NextResponse.json(result);
  } catch (error) {
    return storeErrorResponse(error);
  }
}