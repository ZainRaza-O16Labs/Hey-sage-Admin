"use client";

import { useEffect, useState } from "react";
import { AiMessageBanner } from "@/components/ai-management/ai-message-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ParentAgentConfig } from "@/lib/ai-management/store";

type FormState = Omit<ParentAgentConfig, "id" | "organization_id" | "created_at" | "updated_at">;
const initialState: FormState = {
  name: "",
  description: "",
  instructions: "",
  automatic_selection: true,
  fallback_agent_id: null,
  status: "active",
};

type AgentOption = { value: string; label: string };

export function AiRouterForm({ initial }: { initial: ParentAgentConfig | null }) {
  const [form, setForm] = useState<FormState>(initial ?? initialState);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [fetchingAgents, setFetchingAgents] = useState(false);

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  useEffect(() => {
    async function fetchAgents() {
      setFetchingAgents(true);
      try {
        const res = await fetch("/api/agents");
        if (!res.ok) return;
        const data = (await res.json()) as { agents?: Agent[] };
        const agentList = (data?.agents ?? []).map((a: Agent) => ({
          value: a.id,
          label: a.name,
        }));
        setAgents(agentList);
      } catch {
        // ignore
      } finally {
        setFetchingAgents(false);
      }
    }
    fetchAgents();
  }, []);

  async function save() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/ai-management/parent-agent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { error?: string };
      setMessage(response.ok ? "Saved." : payload.error ?? "Could not save the AI Router configuration.");
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const nameError = form.name.trim() === "" ? "Name is required." : undefined;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="parent-name">Name</Label>
        <Input
          id="parent-name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          aria-invalid={!!nameError}
        />
        {nameError && <p className="text-sm text-destructive">Name is required.</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="parent-description">Description</Label>
        <Input
          id="parent-description"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="parent-instructions">Instructions</Label>
        <Textarea
          id="parent-instructions"
          rows={14}
          value={form.instructions}
          onChange={(event) => setForm({ ...form, instructions: event.target.value })}
          placeholder="Describe how the AI Router should coordinate configured categories and agents."
        />
      </div>
      <div className="flex items-center gap-3">
        <input
          id="automatic-selection"
          type="checkbox"
          checked={form.automatic_selection}
          onChange={(event) => setForm({ ...form, automatic_selection: event.target.checked })}
          className="size-4 accent-primary"
        />
        <Label htmlFor="automatic-selection">Automatic agent selection</Label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="parent-fallback-agent">Fallback Agent</Label>
        {fetchingAgents ? (
          <div className="h-10 rounded bg-muted/20 flex items-center justify-center text-xs text-muted-foreground">
            Loading agents…
          </div>
        ) : agents.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No agents available. Enter a fallback agent UUID manually.
          </p>
        ) : (
          <NativeSelect
            id="parent-fallback-agent"
            value={
              form.fallback_agent_id !== null
                ? form.fallback_agent_id
                : agents.length > 0
                  ? agents[0].value
                  : ""
            }
            onChange={(event) =>
              setForm({
                ...form,
                fallback_agent_id:
                  event.target.value === ""
                    ? null
                    : event.target.value,
              })
            }
          >
            <option value="">—</option>
            {agents.map((agent) => (
              <option key={agent.value} value={agent.value}>
                {agent.label}
              </option>
            ))}
          </NativeSelect>
        )}
      </div>
      <div className="max-w-xs space-y-2">
        <Label htmlFor="parent-status">Status</Label>
        <NativeSelect
          id="parent-status"
          value={form.status}
          onChange={(event) =>
            setForm({ ...form, status: event.target.value as FormState["status"] })
          }
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </NativeSelect>
      </div>
      {message ? (
        <AiMessageBanner kind="success" onDismiss={() => setMessage(null)}>
          {message}
        </AiMessageBanner>
      ) : null}
      <Button onClick={save} disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}