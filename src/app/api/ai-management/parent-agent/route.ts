import { NextResponse } from "next/server";
import { getParentAgentConfig, updateParentAgentConfig } from "@/lib/ai-management/store";
import { jsonError, requireApiUser, storeErrorResponse } from "@/lib/api/respond";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    return NextResponse.json({ parentAgent: await getParentAgentConfig() });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return jsonError("AI Router name is required.", 422);
  try {
    const parentAgent = await updateParentAgentConfig({
      name,
      description: typeof body?.description === "string" ? body.description.trim() : "",
      instructions: typeof body?.instructions === "string" ? body.instructions : "",
      automatic_selection: body?.automatic_selection !== false,
      fallback_agent_id: typeof body?.fallback_agent_id === "string" ? body.fallback_agent_id : null,
      status: body?.status === "inactive" ? "inactive" : "active",
    });
    return NextResponse.json({ parentAgent });
  } catch (error) {
    return storeErrorResponse(error);
  }
}
