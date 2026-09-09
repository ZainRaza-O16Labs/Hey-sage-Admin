import { NextResponse } from "next/server";
import { getTool, updateToolStatus } from "@/lib/ai-management/store";
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
  if (!isUuid(id)) return jsonError("Invalid tool id.", 400);
  try {
    const tool = await getTool(id);
    if (!tool) return jsonError("Tool not found.", 404);
    return NextResponse.json({ tool });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid tool id.", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const status =
    body && typeof body === "object"
      ? (body as Record<string, unknown>).status
      : undefined;
  if (status !== "active" && status !== "inactive") {
    return jsonError("status must be 'active' or 'inactive'.", 400);
  }

  try {
    const tool = await updateToolStatus(id, status);
    return NextResponse.json({ tool });
  } catch (error) {
    return storeErrorResponse(error);
  }
}