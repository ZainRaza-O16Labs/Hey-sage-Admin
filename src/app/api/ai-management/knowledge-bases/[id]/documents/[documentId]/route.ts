import { NextResponse } from "next/server";
import {
  deleteKnowledgeBaseDocument,
  getKnowledgeBaseDocument,
} from "@/lib/ai-management/knowledge-base-documents";
import { isUuid } from "@/lib/agents/schema";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

type RouteContext = {
  params: Promise<{ id: string; documentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { id, documentId } = await context.params;
  if (!isUuid(id) || !isUuid(documentId)) return jsonError("Invalid id.", 400);
  try {
    const document = await getKnowledgeBaseDocument(id, documentId);
    if (!document) return jsonError("Document not found.", 404);
    return NextResponse.json({ document });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { id, documentId } = await context.params;
  if (!isUuid(id) || !isUuid(documentId)) return jsonError("Invalid id.", 400);
  try {
    await deleteKnowledgeBaseDocument(id, documentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return storeErrorResponse(error);
  }
}