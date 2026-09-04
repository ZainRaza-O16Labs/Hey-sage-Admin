import { NextResponse } from "next/server";
import { createCategory, listCategories } from "@/lib/ai-management/store";
import { jsonError, requireApiUser, storeErrorResponse } from "@/lib/api/respond";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    return NextResponse.json({ categories: await listCategories() });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return jsonError("Category name is required.", 422);
  try {
    const category = await createCategory({
      name,
      description: typeof body?.description === "string" ? body.description.trim() : "",
      instructions: typeof body?.instructions === "string" ? body.instructions : "",
      status: body?.status === "inactive" ? "inactive" : "active",
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return storeErrorResponse(error);
  }
}
