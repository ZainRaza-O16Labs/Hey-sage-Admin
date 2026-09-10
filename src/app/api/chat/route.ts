import { NextResponse } from "next/server";
import { isUuid } from "@/lib/agents/schema";
import {
  productionChat,
  productionChatStream,
  testAgentChat,
} from "@/lib/server/internal";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

/**
 * Admin chat endpoint.
 *
 * - mode "preview" (default for agent preview): internal test path, any
 *   lifecycle, no persistence. Requires agentId.
 * - mode "playground" (Playground): production gateway /api/chat with
 *   persistence + optional Parent/Router when agentId omitted.
 */
export async function POST(request: Request) {
  const authStarted = performance.now();
  const auth = await requireApiUser();
  const authMs = Math.round(performance.now() - authStarted);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const source = body as Record<string, unknown> | null;
  const mode =
    source?.mode === "playground"
      ? "playground"
      : source?.mode === "preview"
        ? "preview"
        : // Legacy callers (agent preview) omit mode and send only agentId.
          source?.conversationId || source?.conversation_id
          ? "playground"
          : "preview";

  const message =
    typeof source?.message === "string" ? source.message.trim() : "";
  if (!message) return jsonError("Message is required.", 400);

  try {
    if (mode === "preview") {
      const agentId =
        typeof source?.agentId === "string" ? source.agentId.trim() : "";
      if (!isUuid(agentId)) return jsonError("Invalid agent id.", 400);
      const { reply, toolCalls } = await testAgentChat(agentId, message);
      return NextResponse.json({ reply, response: reply, toolCalls });
    }

    const agentIdRaw =
      typeof source?.agentId === "string"
        ? source.agentId.trim()
        : typeof source?.agent_id === "string"
          ? source.agent_id.trim()
          : "";
    const conversationIdRaw =
      typeof source?.conversationId === "string"
        ? source.conversationId.trim()
        : typeof source?.conversation_id === "string"
          ? source.conversation_id.trim()
          : "";

    if (agentIdRaw && !isUuid(agentIdRaw)) {
      return jsonError("Invalid agent id.", 400);
    }
    if (conversationIdRaw && !isUuid(conversationIdRaw)) {
      return jsonError("Invalid conversation id.", 400);
    }

    // Streaming proxy: pass the gateway SSE stream through to the Playground
    // with authMs merged into the final `done` payload (keeps the JSON shape).
    if (source?.stream === true) {
      const upstream = await productionChatStream({
        message,
        agentId: agentIdRaw || null,
        conversationId: conversationIdRaw || null,
        userId: auth.user?.id ?? null,
        signal: request.signal,
      });
      const body = upstream.body;
      if (!body) {
        return storeErrorResponse(
          new Error("Chat stream had no body."),
        );
      }
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const relayed = new ReadableStream<Uint8Array>({
        async start(controller) {
          const reader = body.getReader();
          let buffer = "";
          let authApplied = false;
          const flush = (): void => {
            let idx: number;
            while ((idx = buffer.indexOf("\n\n")) !== -1) {
              const block = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);
              if (
                !authApplied &&
                (block.startsWith("event: done") ||
                  block.includes('"type":"done"') ||
                  block.startsWith("event: done\n"))
              ) {
                authApplied = true;
                const dataMatch = block.match(/\ndata: (\{.*\})$/);
                if (dataMatch?.[1]) {
                  try {
                    const payload = JSON.parse(dataMatch[1]) as {
                      timings?: Record<string, unknown>;
                    };
                    if (payload.timings) {
                      payload.timings = {
                        ...payload.timings,
                        authMs,
                      };
                    }
                    void payload;
                    const rewritten = `event: done\ndata: ${JSON.stringify(payload)}\n\n`;
                    controller.enqueue(encoder.encode(rewritten));
                    continue;
                  } catch {
                    // Fall through to passthrough below.
                  }
                }
              }
              controller.enqueue(encoder.encode(`${block}\n\n`));
            }
          };
          try {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              flush();
            }
            buffer += decoder.decode();
            flush();
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });
      return new NextResponse(relayed, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const result = await productionChat({
      message,
      agentId: agentIdRaw || null,
      conversationId: conversationIdRaw || null,
      userId: auth.user?.id ?? null,
    });

    return NextResponse.json({
      reply: result.reply,
      response: result.reply,
      conversationId: result.conversationId,
      conversation_id: result.conversationId,
      agentId: result.agentId,
      agent_id: result.agentId,
      categoryId: result.categoryId,
      category_id: result.categoryId,
      toolCalls: result.toolCalls,
      timings: {
        ...result.timings,
        authMs,
      },
    });
  } catch (error) {
    return storeErrorResponse(error);
  }
}
