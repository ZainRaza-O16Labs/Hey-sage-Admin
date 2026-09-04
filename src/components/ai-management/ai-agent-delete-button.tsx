"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AIConfirmDialog } from "@/components/ai-management/ai-confirm-dialog";

export function AiAgentDeleteButton({ id, name }: { id: string; name: string }) {
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
      router.push("/ai-management/agents");
      router.refresh();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <AIConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Agent"
        description={`Are you sure you want to delete "${name}"? This will also delete associated conversations and knowledge documents. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        loading={deleting}
      />
    </>
  );
}
