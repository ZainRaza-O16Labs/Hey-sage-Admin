"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import type { AgentStatus } from "@/lib/agents/schema";

export function AgentStatusSelect({
  id,
  status,
}: {
  id: string;
  status: AgentStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, setPending] = useState(false);

  async function onChange(next: AgentStatus) {
    const previous = value;
    setValue(next);
    setPending(true);
    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        setValue(previous);
        return;
      }
      router.refresh();
    } catch {
      setValue(previous);
    } finally {
      setPending(false);
    }
  }

  return (
    <NativeSelect
      aria-label="Agent status"
      value={value}
      disabled={pending}
      onChange={(event) => onChange(event.target.value as AgentStatus)}
      className="h-7 w-[110px]"
    >
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </NativeSelect>
  );
}
