import { NextResponse } from "next/server";
import {
  deleteConversation,
  getConversation,
  listConversationMessages,
  listConversationToolCalls,
} from "@/lib/ai-management/conversations-store";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/ai-management/store";
import { isUuid } from "@/lib/agents/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid conversation id.", 400);

  try {
    const conversation = await getConversation(DEFAULT_ORGANIZATION_ID, id);
    if (!conversation) return jsonError("Conversation not found.", 404);
    const messages = await listConversationMessages(id);
    const toolCalls = await listConversationToolCalls(id);
    return NextResponse.json({ conversation, messages, toolCalls });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid conversation id.", 400);

  try {
    await deleteConversation(DEFAULT_ORGANIZATION_ID, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return storeErrorResponse(error);
  }
}
