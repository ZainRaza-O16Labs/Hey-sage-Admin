import { NextResponse } from "next/server";
import { isUuid } from "@/lib/agents/schema";
import { getAgent } from "@/lib/agents/store";
import { listDocuments } from "@/lib/agents/documents";
import { enqueueUploadedDocument } from "@/lib/agents/process-document";
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
  if (!isUuid(id)) return jsonError("Invalid agent id.", 400);

  try {
    const agent = await getAgent(id);
    if (!agent) return jsonError("Agent not found.", 404);
    const documents = await listDocuments(id);
    return NextResponse.json({ documents });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid agent id.", 400);

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("Choose a PDF or Markdown file.");
    }
    const scopeRaw = form.get("scope");
    const scope = scopeRaw === "shared" ? "shared" : "agent";

    const bytes = Buffer.from(await file.arrayBuffer());
    await enqueueUploadedDocument({
      agentId: id,
      filename: file.name || "document",
      mimeType: file.type,
      bytes,
      scope,
    });

    const documents = await listDocuments(id);
    const agent = await getAgent(id);
    return NextResponse.json({ documents, agent });
  } catch (error) {
    return storeErrorResponse(error);
  }
}
