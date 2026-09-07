import { NextResponse } from "next/server";
import {
  listConversations,
} from "@/lib/ai-management/conversations-store";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/ai-management/store";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim() ?? "";
  const limitRaw = Number(url.searchParams.get("limit") ?? 50);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
  const limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? limitRaw : 50;

  try {
    const conversations = await listConversations({
      organizationId: DEFAULT_ORGANIZATION_ID,
      query,
      limit,
      offset,
    });
    return NextResponse.json({ conversations });
  } catch (error) {
    return storeErrorResponse(error);
  }
}
