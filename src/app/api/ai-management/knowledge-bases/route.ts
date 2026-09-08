import { NextResponse } from "next/server";
import {
  createKnowledgeBase,
  listKnowledgeBases,
  listKnowledgeBaseStats,
  type AiKnowledgeBaseStats,
} from "@/lib/ai-management/store";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const knowledgeBases = await listKnowledgeBases();
    const stats: Record<string, AiKnowledgeBaseStats> = await listKnowledgeBaseStats().catch(
      () => ({} as Record<string, AiKnowledgeBaseStats>),
    );
    return NextResponse.json({
      knowledgeBases: knowledgeBases.map((kb) => ({
        ...kb,
        ...(stats[kb.id] ?? {
          documentCount: 0,
          readyDocumentCount: 0,
          chunkCount: 0,
          agentCount: 0,
        }),
      })),
    });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

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
  if (!source || typeof source !== "object") {
    return jsonError("Invalid payload.", 422);
  }

  const name = typeof source.name === "string" ? source.name.trim() : "";
  const description =
    typeof source.description === "string" ? source.description.trim() : "";
  const status =
    source.status === "inactive" ? "inactive" : source.status === "active" ? "active" : "active";
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Name is required.";
  else if (name.length > 80) errors.name = "Name must be 80 characters or less.";
  if (description.length > 280) errors.description = "Description must be 280 characters or less.";
  if (Object.keys(errors).length > 0) {
    return jsonError("Please fix the highlighted fields.", 422, errors);
  }

  try {
    const knowledgeBase = await createKnowledgeBase({ name, description, status });
    return NextResponse.json({ knowledgeBase });
  } catch (error) {
    return storeErrorResponse(error);
  }
}