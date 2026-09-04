"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteAgentButton({
  id,
  name,
  stayOnPage = false,
  size = "default",
}: {
  id: string;
  name: string;
  stayOnPage?: boolean;
  size?: "default" | "sm";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const confirmed = window.confirm(
      `Delete “${name}”? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not delete agent.");
        return;
      }
      if (stayOnPage) {
        router.refresh();
      } else {
        router.push("/agents");
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        size={size}
        variant="destructive"
        onClick={onDelete}
        disabled={pending}
      >
        {pending ? "Deleting…" : "Delete"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
