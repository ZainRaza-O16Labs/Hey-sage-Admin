"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Agent, KnowledgeDocument } from "@/lib/agents/schema";

function statusLabel(status: KnowledgeDocument["status"]) {
  if (status === "indexed") return "Indexed";
  if (status === "processing" || status === "uploading") return "Processing";
  return "Failed";
}

function documentName(document: KnowledgeDocument) {
  return document.file_name || document.filename;
}

function kindLabel(document: KnowledgeDocument) {
  if (
    document.metadata?.type === "markdown" ||
    documentName(document).toLowerCase().endsWith(".md")
  ) {
    return "MD";
  }
  return "PDF";
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatProcessedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`;
}

export function AgentDocuments({
  agentId,
  documents,
}: {
  agentId: string;
  documents: KnowledgeDocument[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<"agent" | "shared">("agent");

  async function upload(file: File) {
    const body = new FormData();
    body.append("file", file);
    body.append("scope", scope);
    const response = await fetch(`/api/agents/${agentId}/documents`, {
      method: "POST",
      body,
    });
    const payload = (await response.json()) as { error?: string; agent?: Agent };
    if (!response.ok) {
      throw new Error(payload.error ?? "Could not upload file.");
    }
  }

  async function uploadMany(files: FileList | File[]) {
    setPending(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await upload(file);
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload file.");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(documentId: string, filename: string) {
    const confirmed = window.confirm(`Delete “${filename}”?`);
    if (!confirmed) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/agents/${agentId}/documents/${documentId}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not delete document.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="knowledge-scope"
            checked={scope === "agent"}
            onChange={() => setScope("agent")}
            disabled={pending}
          />
          Agent-specific
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="knowledge-scope"
            checked={scope === "shared"}
            onChange={() => setScope("shared")}
            disabled={pending}
          />
          Shared organization
        </label>
        <p className="text-xs text-muted-foreground">
          Shared docs are available to every agent in this organization.
        </p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-8 text-center">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.md,application/pdf,text/markdown"
          multiple
          className="sr-only"
          disabled={pending}
          onChange={(event) => {
            const files = event.target.files;
            if (files?.length) void uploadMany(files);
          }}
        />
        <p className="text-sm font-medium">
          {pending
            ? "Uploading…"
            : scope === "shared"
              ? "Drop shared organization PDF/MD files"
              : "Drop agent-specific PDF/MD files"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
        <p className="mt-3 text-xs text-muted-foreground">PDF • MD</p>
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents yet.</p>
      ) : (
        <ul className="space-y-3">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{documentName(document)}</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    document.scope === "shared" ? "Shared" : "Agent",
                    kindLabel(document),
                    formatSize(document.file_size),
                    document.metadata?.heading,
                    document.page_count ? `${document.page_count} pages` : null,
                    document.status === "indexed" && document.chunk_count > 0
                      ? `${document.chunk_count} chunks`
                      : null,
                    formatProcessedAt(document.processed_at),
                    document.processing_error ?? document.error_message,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  variant={
                    document.status === "indexed"
                      ? "default"
                      : document.status === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {statusLabel(document.status)}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => void remove(document.id, documentName(document))}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
