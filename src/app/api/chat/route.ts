import { NextResponse } from "next/server";
import { isUuid } from "@/lib/agents/schema";
import { testAgentChat } from "@/lib/server/internal";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

/**
 * Admin chat: tests any agent (Draft/Unpublished/Published) through the real
 * runtime without persisting conversations. Used by the Playground and the
 * per-agent preview page.
 */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const source = body as Record<string, unknown> | null;
  const agentId =
    typeof source?.agentId === "string" ? source.agentId.trim() : "";
  const message = typeof source?.message === "string" ? source.message.trim() : "";
  if (!isUuid(agentId)) return jsonError("Invalid agent id.", 400);
  if (!message) return jsonError("Message is required.", 400);

  try {
    const reply = await testAgentChat(agentId, message);
    return NextResponse.json({ reply, response: reply });
  } catch (error) {
    return storeErrorResponse(error);
  }
}