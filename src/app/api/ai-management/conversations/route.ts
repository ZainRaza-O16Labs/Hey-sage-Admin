import { NextResponse } from "next/server";
import { listConversations, getConversation as getConv } from "@/lib/ai-management/conversations-store";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const conversations = await listConversations({
      organizationId: "a0000000-0000-4000-8000-000000000001",
      limit: 50,
    });
    return NextResponse.json({ conversations });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function POST(_request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  return jsonError("Conversation creation is not supported via this endpoint.", 405);
}