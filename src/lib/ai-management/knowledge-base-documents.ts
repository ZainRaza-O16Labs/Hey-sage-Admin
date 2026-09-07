import {
  getKnowledgeBase,
  AiManagementStoreError,
  requireStore as requireAiStore,
} from "@/lib/ai-management/store";
import { AgentsStoreError } from "@/lib/agents/store";
import { detectDocumentKind, storageMimeType } from "@/lib/agents/file-kind";
import { enqueueKnowledgeBaseDocumentProcess } from "@/lib/server/internal";
import type { AiDocument } from "@/lib/ai-management/knowledge-bases";

const BUCKET = "agent-documents";
const MAX_BYTES = 15 * 1024 * 1024;

const LIST_COLUMNS =
  "id, knowledge_base_id, filename, mime_type, file_size, status, chunk_count, error_message, organization_id, agent_id, scope, storage_path, metadata, page_count, processed_at, created_at, updated_at";

function isDocumentStatus(value: string): value is AiDocument["status"] {
  return (
    value === "pending" ||
    value === "processing" ||
    value === "ready" ||
    value === "error"
  );
}

function mapDocument(row: Record<string, unknown>): AiDocument {
  const status = String(row.status ?? "pending");
  return {
    id: String(row.id),
    knowledge_base_id: String(row.knowledge_base_id ?? ""),
    filename: String(row.filename ?? ""),
    mime_type: String(row.mime_type ?? "application/pdf"),
    file_size: typeof row.file_size === "number" ? row.file_size : null,
    status: isDocumentStatus(status) ? status : "pending",
    chunk_count: typeof row.chunk_count === "number" ? row.chunk_count : 0,
    error_message:
      typeof row.error_message === "string" ? row.error_message : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function listKnowledgeBaseDocuments(
  knowledgeBaseId: string,
): Promise<AiDocument[]> {
  const supabase = requireAiStore();
  const { data, error } = await supabase
    .from("knowledge_documents")
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
    .from("knowledge_documents")
    .insert({
      organization_id: kb.organization_id,
      agent_id: null,
      scope: "shared",
      knowledge_base_id: kb.id,
      filename: input.filename,
      storage_path: tempPath,
      mime_type: mimeType,
      file_size: input.bytes.length,
      metadata: {
        filename: input.filename,
        type: kind,
        heading: null,
        headings: [],
      },
      status: "pending",
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
      .from("knowledge_documents")
      .update({ storage_path: finalPath, status: "processing", error_message: null })
      .eq("id", documentId);

    await enqueueKnowledgeBaseDocumentProcess(kb.id, documentId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not enqueue document processing.";
    await supabase
      .from("knowledge_documents")
      .update({ status: "error", error_message: message })
      .eq("id", documentId);
    throw error instanceof AgentsStoreError
      ? error
      : new AgentsStoreError(message, 503);
  }

  return { documentId };
}

export async function getKnowledgeBaseDocument(
  knowledgeBaseId: string,
  documentId: string,
): Promise<AiDocument | null> {
  const supabase = requireAiStore();
  const { data, error } = await supabase
    .from("knowledge_documents")
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
    .from("knowledge_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();
  const storagePath = (doc as { storage_path?: string } | null)?.storage_path;
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
  }
  await supabase.from("knowledge_chunks").delete().eq("document_id", documentId);
  const { error } = await supabase
    .from("knowledge_documents")
    .delete()
    .eq("id", documentId);
  if (error) throw new AgentsStoreError(error.message);
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
    .from("knowledge_documents")
    .update({ status: "processing", error_message: null, chunk_count: 0 })
    .eq("id", documentId);
  if (error) throw new AgentsStoreError(error.message);

  await enqueueKnowledgeBaseDocumentProcess(knowledgeBaseId, documentId);
}