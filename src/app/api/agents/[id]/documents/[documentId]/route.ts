import { NextResponse } from "next/server";
import { isUuid } from "@/lib/agents/schema";
import { deleteDocument, listDocuments } from "@/lib/agents/documents";
import { getAgent } from "@/lib/agents/store";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

type RouteContext = {
  params: Promise<{ id: string; documentId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id, documentId } = await context.params;
  if (!isUuid(id) || !isUuid(documentId)) {
    return jsonError("Invalid id.", 400);
  }

  try {
    await deleteDocument(id, documentId);
    const documents = await listDocuments(id);
    const agent = await getAgent(id);
    return NextResponse.json({ documents, agent });
  } catch (error) {
    return storeErrorResponse(error);
  }
}
