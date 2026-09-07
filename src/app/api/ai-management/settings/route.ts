import { NextResponse } from "next/server";
import {
  getAISettings,
  updateAISettings,
  type AiSettings,
} from "@/lib/ai-management/store";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const settings = await getAISettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }
  const source = body as Record<string, unknown> | null;
  if (!source || typeof source !== "object") {
    return jsonError("Invalid payload.", 422);
  }

  const input: Partial<AiSettings> & { elevenlabs_api_key?: string | null } = {};
  if ("default_model" in source && typeof source.default_model === "string") {
    input.default_model = source.default_model.trim() || "gpt-4o";
  }
  if ("default_temperature" in source) {
    const value = Number(source.default_temperature);
    if (Number.isFinite(value) && value >= 0 && value <= 2) input.default_temperature = value;
  }
  if ("default_top_k" in source) {
    const value = Number(source.default_top_k);
    if (Number.isFinite(value) && value >= 1 && value <= 20) input.default_top_k = Math.round(value);
  }
  if ("similarity_threshold" in source) {
    const value = Number(source.similarity_threshold);
    if (Number.isFinite(value) && value >= 0 && value <= 1) input.similarity_threshold = value;
  }
  if ("memory_enabled" in source) {
    input.memory_enabled = Boolean(source.memory_enabled);
  }
  if ("elevenlabs_api_key" in source) {
    input.elevenlabs_api_key =
      typeof source.elevenlabs_api_key === "string"
        ? source.elevenlabs_api_key.trim() || null
        : null;
  }
  if (Object.keys(input).length === 0) {
    return jsonError("No settings to update.", 422);
  }

  try {
    const settings = await updateAISettings(input);
    return NextResponse.json({ settings });
  } catch (error) {
    return storeErrorResponse(error);
  }
}