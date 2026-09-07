import { NextResponse } from "next/server";
import {
  deleteKnowledgeBase,
  getKnowledgeBase,
  getKnowledgeBaseStats,
  updateKnowledgeBase,
} from "@/lib/ai-management/store";
import { isUuid } from "@/lib/agents/schema";
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
  if (!isUuid(id)) return jsonError("Invalid knowledge base id.", 400);
  try {
    const knowledgeBase = await getKnowledgeBase(id);
    return NextResponse.json({ knowledgeBase });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid knowledge base id.", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const source = body as Record<string, unknown> | null;
  if (!source || typeof source !== "object") return jsonError("Invalid payload.", 422);

  const input: { name?: string; description?: string; status?: "active" | "inactive" } = {};
  if ("name" in source) {
    const name = typeof source.name === "string" ? source.name.trim() : "";
    if (!name) return jsonError("Name is required.", 422);
    input.name = name;
  }
  if ("description" in source) {
    input.description = typeof source.description === "string" ? source.description.trim() : "";
  }
  if ("status" in source) {
    if (source.status !== "active" && source.status !== "inactive") {
      return jsonError("Status must be active or inactive.", 422);
    }
    input.status = source.status;
  }
  if (Object.keys(input).length === 0) {
    return jsonError("No fields to update.", 422);
  }

  try {
    const knowledgeBase = await updateKnowledgeBase(id, input);
    return NextResponse.json({ knowledgeBase });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid knowledge base id.", 400);
  try {
    await deleteKnowledgeBase(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return storeErrorResponse(error);
  }
}