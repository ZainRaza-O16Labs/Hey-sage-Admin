"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { Agent, AgentInput, FieldErrors } from "@/lib/agents/schema";

const emptyForm: AgentInput = {
  name: "",
  description: "",
  instructions: "",
  status: "active",
};

type AgentFormProps = {
  mode: "create" | "edit";
  agent?: Agent;
};

export function AgentForm({ mode, agent }: AgentFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<AgentInput>(
    agent
      ? {
          name: agent.name,
          description: agent.description,
          instructions: agent.instructions,
          status: agent.status,
        }
      : emptyForm,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update<K extends keyof AgentInput>(key: K, value: AgentInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setErrors({});

    try {
      const response = await fetch(
        mode === "create" ? "/api/agents" : `/api/agents/${agent?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const payload = (await response.json()) as {
        agent?: Agent;
        error?: string;
        errors?: FieldErrors;
      };

      if (!response.ok) {
        setErrors(payload.errors ?? {});
        setMessage(payload.error ?? "Could not save agent.");
        return;
      }

      if (mode === "create" && payload.agent) {
        router.push(`/agents/${payload.agent.id}`);
        router.refresh();
        return;
      }

      router.refresh();
      setMessage("Saved.");
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-5">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="Sage"
          aria-invalid={Boolean(errors.name)}
          required
        />
        {errors.name ? (
          <p className="text-sm text-destructive">{errors.name}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
          placeholder="Short internal label for this agent"
          aria-invalid={Boolean(errors.description)}
        />
        {errors.description ? (
          <p className="text-sm text-destructive">{errors.description}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          name="instructions"
          value={form.instructions}
          onChange={(event) => update("instructions", event.target.value)}
          placeholder="Paste the agent's authoritative system instruction here…"
          aria-invalid={Boolean(errors.instructions)}
          rows={18}
          className="min-h-72 font-mono text-xs leading-relaxed"
        />
        {errors.instructions ? (
          <p className="text-sm text-destructive">{errors.instructions}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Operational system prompt for Mastra. Tune manually, test with Sage,
            then save.
          </p>
        )}
      </div>

      <div className="max-w-xs space-y-2">
        <Label htmlFor="status">Status</Label>
        <NativeSelect
          id="status"
          name="status"
          value={form.status}
          onChange={(event) =>
            update("status", event.target.value as AgentInput["status"])
          }
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </NativeSelect>
      </div>

      {message ? (
        <p
          className={
            message === "Saved."
              ? "text-sm text-muted-foreground"
              : "text-sm text-destructive"
          }
        >
          {message}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create Agent"
              : "Save changes"}
        </Button>
        {mode === "edit" ? (
          <Button
            type="button"
            variant="outline"
            className="ml-2"
            nativeButton={false}
            render={<Link href="/agents" />}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
