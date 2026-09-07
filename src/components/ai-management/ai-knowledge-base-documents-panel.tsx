"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AiDocument } from "@/lib/ai-management/knowledge-bases";

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusVariant(status: AiDocument["status"]): "default" | "destructive" | "secondary" {
  if (status === "ready") return "default";
  if (status === "error") return "destructive";
  return "secondary";
}

export function AiKnowledgeBaseDocumentsPanel({
  knowledgeBaseId,
  initialDocuments,
}: {
  knowledgeBaseId: string;
  initialDocuments: AiDocument[];
}) {
  const [documents, setDocuments] = useState<AiDocument[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  async function load() {
    try {
      const response = await fetch(`/api/ai-management/knowledge-bases/${knowledgeBaseId}/documents`);
      if (!response.ok) throw new Error("Could not load documents.");
      const data = (await response.json()) as { documents: AiDocument[] };
      setDocuments(data.documents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load documents.");
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/ai-management/knowledge-bases/${knowledgeBaseId}/documents`, {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not upload document.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(documentId: string) {
    setActionId(documentId);
    setError(null);
    try {
      const response = await fetch(`/api/ai-management/knowledge-bases/${knowledgeBaseId}/documents/${documentId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not delete document.");
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setActionId(null);
    }
  }

  async function handleReindex(documentId: string) {
    setActionId(documentId);
    setError(null);
    try {
      const response = await fetch(`/api/ai-management/knowledge-bases/${knowledgeBaseId}/documents/${documentId}/reindex`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not reindex document.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reindex failed.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-4">
      <input ref={inputRef} type="file" accept=".pdf,.md,.markdown,application/pdf,text/markdown" className="hidden" onChange={(e) => void handleUpload(e)} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          PDF and Markdown files, 15MB max. Chunks become searchable for assigned agents.
        </p>
        <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <FileUp className="size-4" />
          {uploading ? "Uploading..." : "Upload Document"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm font-medium">No documents uploaded</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload PDF or Markdown files, then assign this knowledge base to agents from the agent editor.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{doc.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(doc.file_size)}
                  {doc.chunk_count > 0 ? ` · ${doc.chunk_count} chunks` : ""}
                  {doc.error_message ? ` · ${doc.error_message}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
                {doc.status === "error" || doc.status === "ready" ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Reindex"
                    disabled={actionId === doc.id}
                    onClick={() => void handleReindex(doc.id)}
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                ) : null}
                <Button
                  size="icon"
                  variant="ghost"
                  title="Delete"
                  disabled={actionId === doc.id}
                  onClick={() => void handleDelete(doc.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}