export type AiKnowledgeBase = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type AiDocument = {
  id: string;
  knowledge_base_id: string;
  /** @deprecated Prefer file_name */
  filename: string;
  file_name: string;
  mime_type: string;
  file_size: number | null;
  status: "uploading" | "processing" | "indexed" | "failed";
  chunk_count: number;
  /** @deprecated Prefer processing_error */
  error_message: string | null;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchKnowledgeBases(): Promise<AiKnowledgeBase[]> {
  try {
    const response = await fetch("/api/ai-management/knowledge-bases");
    if (!response.ok) return [];
    const data = (await response.json()) as { knowledgeBases: AiKnowledgeBase[] };
    return data.knowledgeBases ?? [];
  } catch {
    return [];
  }
}

export async function fetchKnowledgeBase(id: string): Promise<AiKnowledgeBase | null> {
  try {
    const response = await fetch(`/api/ai-management/knowledge-bases/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) return null;
    const data = (await response.json()) as { knowledgeBase: AiKnowledgeBase };
    return data.knowledgeBase;
  } catch {
    return null;
  }
}

export async function createKnowledgeBaseApi(input: {
  name: string;
  description: string;
  status: "active" | "inactive";
}): Promise<AiKnowledgeBase> {
  const response = await fetch("/api/ai-management/knowledge-bases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Could not create knowledge base.");
  }
  const data = (await response.json()) as { knowledgeBase: AiKnowledgeBase };
  return data.knowledgeBase;
}

export async function updateKnowledgeBase(id: string, input: {
  name: string;
  description: string;
  status: "active" | "inactive";
}): Promise<AiKnowledgeBase> {
  const response = await fetch(`/api/ai-management/knowledge-bases/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Could not update knowledge base.");
  }
  const data = (await response.json()) as { knowledgeBase: AiKnowledgeBase };
  return data.knowledgeBase;
}

export async function deleteKnowledgeBase(id: string): Promise<void> {
  const response = await fetch(`/api/ai-management/knowledge-bases/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Could not delete knowledge base.");
  }
}

export async function fetchDocuments(knowledgeBaseId: string): Promise<AiDocument[]> {
  try {
    const response = await fetch(`/api/ai-management/knowledge-bases/${knowledgeBaseId}/documents`);
    if (!response.ok) return [];
    const data = (await response.json()) as { documents: AiDocument[] };
    return data.documents ?? [];
  } catch {
    return [];
  }
}

export async function uploadDocument(knowledgeBaseId: string, file: File): Promise<AiDocument> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`/api/ai-management/knowledge-bases/${knowledgeBaseId}/documents`, {
    method: "POST",
    body,
  });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Could not upload document.");
  }
  const data = (await response.json()) as { document: AiDocument };
  return data.document;
}

export async function deleteDocument(knowledgeBaseId: string, documentId: string): Promise<void> {
  const response = await fetch(`/api/ai-management/knowledge-bases/${knowledgeBaseId}/documents/${documentId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Could not delete document.");
  }
}
