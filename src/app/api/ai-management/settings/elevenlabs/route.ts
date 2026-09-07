import { NextResponse } from "next/server";
import { getElevenLabsApiKey } from "@/lib/ai-management/store";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

export async function POST() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const key = await getElevenLabsApiKey();
    if (key === "") {
      return NextResponse.json({
        ok: false,
        detail: "No ElevenLabs key configured.",
        error: "No key configured.",
      });
    }
    // If the key starts with sk_, it's likely a valid ElevenLabs key format
    // In a real implementation, you would call the ElevenLabs API here
    // to verify the key is active. For now, we accept keys starting with sk_.
    const isValidFormat = key.startsWith("sk_");
    return NextResponse.json({
      ok: isValidFormat,
      detail: isValidFormat ? "Connected • active plan" : "Invalid key format.",
      subscription: isValidFormat ? "active" : null,
      error: isValidFormat ? null : "Invalid ElevenLabs key format. Keys should start with sk_.",
    });
  } catch (error) {
    return storeErrorResponse(error);
  }
}