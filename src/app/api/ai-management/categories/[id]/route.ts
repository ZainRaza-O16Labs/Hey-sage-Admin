import { NextResponse } from "next/server";
import { getCategory, updateCategory, deleteCategory } from "@/lib/ai-management/store";
import { isUuid } from "@/lib/agents/schema";
import { jsonError, requireApiUser, storeErrorResponse } from "@/lib/api/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid category id.", 400);
  try {
    const category = await getCategory(id);
    return NextResponse.json({ category });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid category id.", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const source = body as Record<string, unknown> | null;
  if (!source || typeof source !== "object") return jsonError("Invalid payload.", 422);

  const name = typeof source.name === "string" ? source.name.trim() : undefined;
  const description = typeof source.description === "string" ? source.description.trim() : undefined;
  const instructions = typeof source.instructions === "string" ? source.instructions : undefined;
  const status = source.status === "inactive" ? "inactive" : source.status === "active" ? "active" : undefined;

  try {
    const existing = await getCategory(id);
    const category = await updateCategory(id, {
      name: name ?? existing.name,
      description: description ?? existing.description,
      instructions: instructions ?? existing.instructions,
      status: status ?? existing.status,
    });
    return NextResponse.json({ category });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid category id.", 400);
  try {
    await deleteCategory(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return storeErrorResponse(error);
  }
}
