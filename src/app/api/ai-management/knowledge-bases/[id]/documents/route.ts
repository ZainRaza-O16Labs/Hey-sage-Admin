import { NextResponse } from "next/server";
import { getKnowledgeBase, getKnowledgeBaseStats } from "@/lib/ai-management/store";
import {
  enqueueUploadedKnowledgeBaseDocument,
  listKnowledgeBaseDocuments,
} from "@/lib/ai-management/knowledge-base-documents";
import { isUuid } from "@/lib/agents/schema";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid knowledge base id.", 400);

  try {
    await getKnowledgeBase(id);
    const documents = await listKnowledgeBaseDocuments(id);
    return NextResponse.json({ documents });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid knowledge base id.", 400);

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("Choose a PDF or Markdown file.");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const { documentId } = await enqueueUploadedKnowledgeBaseDocument({
      knowledgeBaseId: id,
      filename: file.name || "document",
      mimeType: file.type,
      bytes,
    });

    const document = (await listKnowledgeBaseDocuments(id)).find(
      (doc) => doc.id === documentId,
    );
    const stats = await getKnowledgeBaseStats(id);
    return NextResponse.json({ document: document ?? null, stats });
  } catch (error) {
    return storeErrorResponse(error);
  }
}