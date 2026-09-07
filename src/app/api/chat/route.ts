import { NextResponse } from "next/server";
import { routeMessageToAgent } from "@/lib/ai-management/router";
import { testAgentChat } from "@/lib/server/internal";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

/**
 * Admin chat: routes user messages through AI Router to permanent agent,
 * then executes via the existing Mastra pipeline with RAG.
 * 
 * Production routing rules:
 * - Only agents that are Published + Active may be selected
 * - Fallback agent or controlled response when no confident routing
 * - Organization scoping is preserved
 * - RAG searches only the agent's assigned Knowledge Bases
 */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const source = body as Record<string, unknown> | null;
  const message =
    typeof source?.message === "string" ? source.message.trim() : "";

  if (!message) return jsonError("Message is required.", 400);

  try {
    // Step 1: Route message through AI Router to get permanent agent
    const routerResult = await routeMessageToAgent(message);

    if (routerResult.fallback || !routerResult.agent) {
      // No production-eligible agent found - return controlled fallback
      return NextResponse.json({
        reply: "I'm sorry, I don't have a available agent to handle this request at the moment. Please try again later or contact an administrator.",
        category: routerResult.category?.name,
        fallback: true,
        reason: routerResult.reason,
      });
    }

    const agent = routerResult.agent!;
    const category = routerResult.category!;

    // Step 2: Execute via existing Mastra pipeline using testAgentChat
    // The agent has already been validated as Published + Active by the router
    // testAgentChat internally calls the Mastra backend which handles RAG
    // with the agent's assigned KBs from ai_agent_knowledge_bases
    const reply = await testAgentChat(agent.id, message);

    return NextResponse.json({
      reply,
      agent: {
        id: agent.id,
        name: agent.name,
        categoryId: agent.category_id,
        lifecycleStatus: agent.lifecycle_status,
        status: agent.status,
      },
      category: { id: category.id, name: category.name },
      fallback: routerResult.fallback,
      reason: routerResult.reason,
    });
  } catch (error) {
    return storeErrorResponse(error);
  }
}
