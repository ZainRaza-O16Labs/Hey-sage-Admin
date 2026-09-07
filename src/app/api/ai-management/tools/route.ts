import { NextResponse } from "next/server";
import { listTools, listToolsByAgent } from "@/lib/ai-management/store";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId")?.trim() ?? "";

  try {
    const tools = agentId
      ? await listToolsByAgent(agentId)
      : await listTools();
    return NextResponse.json({ tools });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function POST() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  return jsonError("Tools are registered by the backend and cannot be created from the admin panel.", 404);
}