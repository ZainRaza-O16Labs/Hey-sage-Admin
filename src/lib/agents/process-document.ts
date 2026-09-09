import { getAgent, AgentsStoreError } from "@/lib/agents/store";
import {
  createDocument,
  documentStoragePath,
  updateDocument,
  uploadDocumentFile,
} from "@/lib/agents/documents";
import { detectDocumentKind, storageMimeType } from "@/lib/agents/file-kind";
import { enqueueDocumentProcess } from "@/lib/server/internal";
import type { KnowledgeScope } from "@/lib/agents/schema";

const MAX_BYTES = 15 * 1024 * 1024;

export async function enqueueUploadedDocument(input: {
  agentId: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
  scope?: KnowledgeScope;
}) {
  const agent = await getAgent(input.agentId);
  if (!agent) {
    throw new AgentsStoreError("Agent not found.", 404);
  }

  const scope: KnowledgeScope = input.scope === "shared" ? "shared" : "agent";
  const kind = detectDocumentKind(input.filename, input.mimeType);
  if (!kind) {
    throw new AgentsStoreError("Only PDF and Markdown (.md) files are supported.", 400);
  }
  if (input.bytes.length > MAX_BYTES) {
    throw new AgentsStoreError("File must be 15MB or smaller.", 400);
  }

  const mimeType = storageMimeType(kind);
  const tempId = crypto.randomUUID();
  const ownerKey =
    scope === "shared"
      ? `org/${agent.organization_id}/shared`
      : input.agentId;
  const storagePath = documentStoragePath(ownerKey, tempId, input.filename);
  const document = await createDocument({
    organizationId: agent.organization_id,
    agentId: scope === "shared" ? null : input.agentId,
    scope,
    filename: input.filename,
    storagePath,
    mimeType,
    fileSize: input.bytes.length,
    metadata: {
      filename: input.filename,
      type: kind,
      heading: null,
      headings: [],
    },
  });

  const finalPath = documentStoragePath(ownerKey, document.id, input.filename);

  try {
    await uploadDocumentFile(finalPath, input.bytes, mimeType);
    await updateDocument(document.id, {
      file_path: finalPath,
      status: "processing",
      processing_error: null,
    });
    // Process via an agent in the same org (shared docs use uploading agent for enqueue).
    await enqueueDocumentProcess(input.agentId, document.id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not enqueue document processing.";
    await updateDocument(document.id, {
      status: "failed",
      processing_error: message,
    });
    throw error instanceof AgentsStoreError
      ? error
      : new AgentsStoreError(message, 503);
  }

  return document.id;
}
