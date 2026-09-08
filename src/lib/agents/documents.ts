import { AgentsStoreError, getAgent, requireStore } from "@/lib/agents/store";
import {
  mapDocumentRow,
  type KnowledgeDocument,
  type KnowledgeScope,
} from "@/lib/agents/schema";

const BUCKET = "agent-documents";

const LIST_COLUMNS =
  "id, organization_id, agent_id, scope, filename, storage_path, mime_type, status, error_message, page_count, file_size, chunk_count, processed_at, metadata, created_at, updated_at";

export async function listDocuments(agentId: string): Promise<KnowledgeDocument[]> {
  const agent = await getAgent(agentId);
  if (!agent) {
    throw new AgentsStoreError("Agent not found.", 404);
  }

  const supabase = requireStore();
  const { data, error } = await supabase
    .from("knowledge_documents")
    .select(LIST_COLUMNS)
    .eq("organization_id", agent.organization_id)
    .or(`agent_id.eq.${agentId},scope.eq.shared`)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AgentsStoreError(error.message);
  }
  return (data ?? []).map((row) => mapDocumentRow(row as Record<string, unknown>));
}

export async function getDocument(
  agentId: string,
  documentId: string,
): Promise<KnowledgeDocument | null> {
  const agent = await getAgent(agentId);
  if (!agent) return null;

  const supabase = requireStore();
  const { data, error } = await supabase
    .from("knowledge_documents")
    .select(LIST_COLUMNS)
    .eq("id", documentId)
    .eq("organization_id", agent.organization_id)
    .maybeSingle();

  if (error) {
    throw new AgentsStoreError(error.message);
  }
  if (!data) return null;
  const document = mapDocumentRow(data as Record<string, unknown>);
  if (document.scope === "shared") return document;
  if (document.agent_id === agentId) return document;
  return null;
}

export async function createDocument(input: {
  organizationId: string;
  agentId: string | null;
  scope: KnowledgeScope;
  filename: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  metadata?: Record<string, unknown>;
}): Promise<KnowledgeDocument> {
  const supabase = requireStore();
  const { data, error } = await supabase
    .from("knowledge_documents")
    .insert({
      organization_id: input.organizationId,
      agent_id: input.scope === "shared" ? null : input.agentId,
      scope: input.scope,
      filename: input.filename,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      metadata: input.metadata ?? {},
      status: "pending",
    })
    .select(LIST_COLUMNS)
    .single();

  if (error || !data) {
    throw new AgentsStoreError(error?.message ?? "Could not create document.");
  }
  return mapDocumentRow(data as Record<string, unknown>);
}

export async function updateDocument(
  documentId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const supabase = requireStore();
  const { error } = await supabase
    .from("knowledge_documents")
    .update(patch)
    .eq("id", documentId);
  if (error) {
    throw new AgentsStoreError(error.message);
  }
}

export async function uploadDocumentFile(
  storagePath: string,
  bytes: Buffer,
  contentType: string,
) {
  const supabase = requireStore();
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new AgentsStoreError(error.message);
  }
}

export async function deleteDocument(
  agentId: string,
  documentId: string,
): Promise<void> {
  const supabase = requireStore();
  const existing = await getDocument(agentId, documentId);
  if (!existing) {
    throw new AgentsStoreError("Document not found.", 404);
  }

  await supabase.storage.from(BUCKET).remove([existing.storage_path]);
  const { error } = await supabase
    .from("knowledge_documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    throw new AgentsStoreError(error.message);
  }
}

/**
 * Per-agent document counts. Mirrors `listDocuments` semantics: an agent sees
 * its own documents plus any shared documents. Returns agent_id -> count.
 */
export async function getAgentDocumentCounts(): Promise<Record<string, number>> {
  const supabase = requireStore();
  const { data, error } = await supabase
    .from("knowledge_documents")
    .select("agent_id, scope");

  if (error) {
    throw new AgentsStoreError(error.message);
  }

  const counts = new Map<string, number>();
  let shared = 0;
  for (const row of (data ?? []) as Array<{
    agent_id: string | null;
    scope?: string;
  }>) {
    if (row.scope === "shared") {
      shared += 1;
    } else if (row.agent_id) {
      counts.set(row.agent_id, (counts.get(row.agent_id) ?? 0) + 1);
    }
  }

  const result: Record<string, number> = {};
  for (const [agentId, count] of counts) {
    result[agentId] = count + shared;
  }
  return result;
}

export function documentStoragePath(
  ownerKey: string,
  documentId: string,
  filename: string,
) {
  const safeName = filename.replace(/[^\w.\-]+/g, "_");
  return `${ownerKey}/${documentId}/${safeName}`;
}
