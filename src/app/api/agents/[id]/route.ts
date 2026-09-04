import { NextResponse } from "next/server";
import { deleteAgent, getAgent, updateAgent } from "@/lib/agents/store";
import { isUuid, validateAgentPatch } from "@/lib/agents/schema";
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
    return NextResponse.json({ agent });
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
    return NextResponse.json({ agent });
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
