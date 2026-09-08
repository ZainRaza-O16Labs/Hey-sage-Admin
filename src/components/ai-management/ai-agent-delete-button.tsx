"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AIConfirmDialog } from "@/components/ai-management/ai-confirm-dialog";
import { notifyError, notifySuccess } from "@/lib/notify";

export function AiAgentDeleteButton({
  id,
  toolsCount = 0,
  knowledgeBaseCount = 0,
  documentsCount = 0,
}: {
  id: string;
  toolsCount?: number;
  knowledgeBaseCount?: number;
  documentsCount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not delete agent.");
      }
      notifySuccess("Agent deleted successfully.");
      router.push("/ai-management/agents");
      router.refresh();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Failed to delete agent.");
      setDeleting(false);
    }
  }

  const description = `Delete Agent? This agent has: ${toolsCount} tools, ${knowledgeBaseCount} knowledge bases, ${documentsCount} documents. Are you sure you want to continue?`;

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <AIConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Agent"
        description={description}
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        loading={deleting}
      />
    </>
  );
}
