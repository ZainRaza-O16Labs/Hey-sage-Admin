"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function AiAgentCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState<AgentInput>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update<K extends keyof AgentInput>(key: K, value: AgentInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setErrors({});

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { agent?: Agent; error?: string; errors?: FieldErrors };

      if (!response.ok) {
        setErrors(payload.errors ?? {});
        setMessage(payload.error ?? "Could not create agent.");
        return;
      }

      if (payload.agent) {
        router.push(`/ai-management/agents/${payload.agent.id}`);
        router.refresh();
      }
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <AiPageHeader
        title="Create Agent"
        description="Define a new specialized AI agent with its own instructions and configuration."
      />
      <Card>
        <CardHeader>
          <CardTitle>New Agent</CardTitle>
          <CardDescription>
            Fill in the details to create a new agent. You can assign tools and knowledge after creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g., Support Agent"
                aria-invalid={Boolean(errors.name)}
                required
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Short internal label for this agent"
                aria-invalid={Boolean(errors.description)}
              />
              {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                name="instructions"
                value={form.instructions}
                onChange={(e) => update("instructions", e.target.value)}
                placeholder="Paste the agent's system instruction here..."
                aria-invalid={Boolean(errors.instructions)}
                rows={18}
                className="min-h-72 font-mono text-xs leading-relaxed"
              />
              {errors.instructions ? (
                <p className="text-sm text-destructive">{errors.instructions}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Character count: {form.instructions.length.toLocaleString()}
                </p>
              )}
            </div>

            <div className="max-w-xs space-y-2">
              <Label htmlFor="status">Status</Label>
              <NativeSelect
                id="status"
                name="status"
                value={form.status}
                onChange={(e) => update("status", e.target.value as AgentInput["status"])}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </NativeSelect>
            </div>

            {message && (
              <p className={message === "Saved." ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
                {message}
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Creating..." : "Create Agent"}
              </Button>
              <Button type="button" variant="outline" nativeButton={false} render={<Link href="/ai-management/agents" />}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
