import {
  getKnowledgeBase,
  AiManagementStoreError,
  requireStore as requireAiStore,
} from "@/lib/ai-management/store";
import { AgentsStoreError } from "@/lib/agents/store";
import { detectDocumentKind, storageMimeType } from "@/lib/agents/file-kind";
import { enqueueKnowledgeBaseDocumentProcess } from "@/lib/server/internal";
import type { AiDocument } from "@/lib/ai-management/knowledge-bases";
import { writeActivityLog } from "@/lib/ai-management/activity-logs";

const BUCKET = "agent-documents";
const MAX_BYTES = 15 * 1024 * 1024;

const LIST_COLUMNS =
  "id, knowledge_base_id, name, file_name, file_path, mime_type, file_size, status, chunk_count, processing_error, organization_id, agent_id, scope, metadata, page_count, processed_at, created_at, updated_at";

function isDocumentStatus(value: string): value is AiDocument["status"] {
  return (
    value === "uploading" ||
    value === "processing" ||
    value === "indexed" ||
    value === "failed"
  );
}

function normalizeStatus(value: string): AiDocument["status"] {
  if (value === "ready") return "indexed";
  if (value === "error") return "failed";
  if (value === "pending") return "uploading";
  return isDocumentStatus(value) ? value : "uploading";
}

function mapDocument(row: Record<string, unknown>): AiDocument {
  const status = String(row.status ?? "uploading");
  const fileName = String(row.file_name ?? row.filename ?? "");
  const processingError =
    typeof row.processing_error === "string"
      ? row.processing_error
      : typeof row.error_message === "string"
        ? row.error_message
        : null;
  return {
    id: String(row.id),
    knowledge_base_id: String(row.knowledge_base_id ?? ""),
    filename: fileName,
    file_name: fileName,
    mime_type: String(row.mime_type ?? "application/pdf"),
    file_size: typeof row.file_size === "number" ? row.file_size : null,
    status: normalizeStatus(status),
    chunk_count: typeof row.chunk_count === "number" ? row.chunk_count : 0,
    error_message: processingError,
    processing_error: processingError,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function listKnowledgeBaseDocuments(
  knowledgeBaseId: string,
): Promise<AiDocument[]> {
  const supabase = requireAiStore();
  const { data, error } = await supabase
    .from("ai_documents")
    .select(LIST_COLUMNS)
    .eq("knowledge_base_id", knowledgeBaseId)
    .order("created_at", { ascending: false });
  if (error) throw new AgentsStoreError(error.message);
  return (data ?? []).map((row) => mapDocument(row as Record<string, unknown>));
}

function documentStoragePath(
  ownerKey: string,
  documentId: string,
  filename: string,
) {
  const safeName = filename.replace(/[^\w.\-]+/g, "_");
  return `${ownerKey}/${documentId}/${safeName}`;
}

export async function enqueueUploadedKnowledgeBaseDocument(input: {
  knowledgeBaseId: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<{ documentId: string }> {
  const kb = await getKnowledgeBase(input.knowledgeBaseId);
  const kind = detectDocumentKind(input.filename, input.mimeType);
  if (!kind) {
    throw new AgentsStoreError(
      "Only PDF and Markdown (.md) files are supported.",
      400,
    );
  }
  if (input.bytes.length > MAX_BYTES) {
    throw new AgentsStoreError("File must be 15MB or smaller.", 400);
  }

  const mimeType = storageMimeType(kind);
  const supabase = requireAiStore();
  const ownerKey = `org/${kb.organization_id}/knowledge-bases/${kb.id}`;
  const tempId = crypto.randomUUID();
  const tempPath = documentStoragePath(ownerKey, tempId, input.filename);

  const { data: document, error } = await supabase
    .from("ai_documents")
    .insert({
      organization_id: kb.organization_id,
      agent_id: null,
      scope: "shared",
      knowledge_base_id: kb.id,
      name: input.filename,
      file_name: input.filename,
      file_path: tempPath,
      mime_type: mimeType,
      file_size: input.bytes.length,
      metadata: {
        filename: input.filename,
        type: kind,
        heading: null,
        headings: [],
      },
      status: "uploading",
    })
    .select(LIST_COLUMNS)
    .single();
  if (error || !document) {
    throw new AgentsStoreError(
      error?.message ?? "Could not create document.",
    );
  }
  const documentId = String(document.id);

  const finalPath = documentStoragePath(ownerKey, documentId, input.filename);
  try {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(finalPath, input.bytes, { contentType: mimeType, upsert: false });
    if (uploadError) throw uploadError;

    await supabase
      .from("ai_documents")
      .update({
        file_path: finalPath,
        status: "processing",
        processing_error: null,
      })
      .eq("id", documentId);

    await enqueueKnowledgeBaseDocumentProcess(kb.id, documentId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not enqueue document processing.";
    await supabase
      .from("ai_documents")
      .update({ status: "failed", processing_error: message })
      .eq("id", documentId);
    throw error instanceof AgentsStoreError
      ? error
      : new AgentsStoreError(message, 503);
  }

  void writeActivityLog({
    action: "upload",
    entityType: "ai_documents",
    entityId: documentId,
    newData: {
      id: documentId,
      knowledge_base_id: kb.id,
      file_name: input.filename,
      status: "processing",
    },
  });
  return { documentId };
}

export async function getKnowledgeBaseDocument(
  knowledgeBaseId: string,
  documentId: string,
): Promise<AiDocument | null> {
  const supabase = requireAiStore();
  const { data, error } = await supabase
    .from("ai_documents")
    .select(LIST_COLUMNS)
    .eq("id", documentId)
    .eq("knowledge_base_id", knowledgeBaseId)
    .maybeSingle();
  if (error) throw new AgentsStoreError(error.message);
  return data ? mapDocument(data as Record<string, unknown>) : null;
}

export async function deleteKnowledgeBaseDocument(
  knowledgeBaseId: string,
  documentId: string,
): Promise<void> {
  const supabase = requireAiStore();
  const existing = await getKnowledgeBaseDocument(knowledgeBaseId, documentId);
  if (!existing) {
    throw new AiManagementStoreError("Document not found.", 404);
  }

  const { data: doc } = await supabase
    .from("ai_documents")
    .select("file_path")
    .eq("id", documentId)
    .maybeSingle();
  const filePath = (doc as { file_path?: string } | null)?.file_path;
  if (filePath) {
    await supabase.storage.from(BUCKET).remove([filePath]);
  }
  await supabase.from("ai_document_chunks").delete().eq("document_id", documentId);
  const { error } = await supabase
    .from("ai_documents")
    .delete()
    .eq("id", documentId);
  if (error) throw new AgentsStoreError(error.message);
  void writeActivityLog({
    action: "delete",
    entityType: "ai_documents",
    entityId: documentId,
    oldData: existing as unknown as Record<string, unknown>,
  });
}

export async function reindexKnowledgeBaseDocument(
  knowledgeBaseId: string,
  documentId: string,
): Promise<void> {
  const supabase = requireAiStore();
  const existing = await getKnowledgeBaseDocument(knowledgeBaseId, documentId);
  if (!existing) {
    throw new AiManagementStoreError("Document not found.", 404);
  }

  const { error } = await supabase
    .from("ai_documents")
    .update({ status: "processing", processing_error: null, chunk_count: 0 })
    .eq("id", documentId);
  if (error) throw new AgentsStoreError(error.message);

  await enqueueKnowledgeBaseDocumentProcess(knowledgeBaseId, documentId);
  void writeActivityLog({
    action: "reindex",
    entityType: "ai_documents",
    entityId: documentId,
    oldData: existing as unknown as Record<string, unknown>,
    newData: { status: "processing" },
  });
}
