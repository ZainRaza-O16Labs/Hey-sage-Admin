"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AIConfirmDialog } from "@/components/ai-management/ai-confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AiDocument | null>(null);
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

  function openUpload() {
    setSelectedFile(null);
    setError(null);
    setUploadOpen(true);
  }

  function selectFile(file: File | null) {
    if (!file) return;
    setSelectedFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", selectedFile);
      const response = await fetch(`/api/ai-management/knowledge-bases/${knowledgeBaseId}/documents`, {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not upload document.");
      await load();
      setUploadOpen(false);
      setSelectedFile(null);
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
      setDeleteTarget(null);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          PDF and Markdown files, 15MB max. Chunks become searchable for assigned agents.
        </p>
        <Button size="sm" onClick={openUpload}>
          <FileUp className="size-4" />
          Upload Document
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Knowledge Document</DialogTitle>
            <DialogDescription>
              Upload a document to make its contents searchable for assigned agents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.md,.markdown,application/pdf,text/markdown"
              className="hidden"
              onChange={(e) => {
                selectFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
                dragging ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <FileUp className="size-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Drag &amp; drop your file here, or</p>
                <p className="text-xs text-muted-foreground">
                  Supported formats: PDF, Markdown (.md, .markdown). Maximum file size: 15MB.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                Browse Files
              </Button>
            </div>

            {selectedFile && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(selectedFile.size)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Knowledge Base</span>
                    <span className="font-medium">{knowledgeBaseId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span>{uploading ? "Uploading..." : "Ready to upload"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleUpload()}
              disabled={!selectedFile || uploading}
            >
              <FileUp className="size-4" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  onClick={() => setDeleteTarget(doc)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AIConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Document"
        description={`This will permanently remove ${deleteTarget?.filename ?? ""} from this knowledge base. Are you sure you want to continue?`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget.id);
        }}
        loading={actionId === deleteTarget?.id}
      />
    </div>
  );
}