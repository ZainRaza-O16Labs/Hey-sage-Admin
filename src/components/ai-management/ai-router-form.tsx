"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { ParentAgentConfig } from "@/lib/ai-management/store";

type FormState = Omit<ParentAgentConfig, "id" | "organization_id" | "created_at" | "updated_at">;
const initialState: FormState = {
  name: "",
  description: "",
  instructions: "",
  automatic_routing: true,
  fallback_agent_id: null,
  status: "active",
};

type Agent = { id: string; name: string };

export function AiRouterForm({
  initial,
}: {
  initial: ParentAgentConfig | null;
}) {
  const [form, setForm] = useState<FormState>(initial ?? initialState);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { agents?: Agent[] } | null) => {
        if (data?.agents) setAgents(data.agents);
      })
      .catch(() => {});
  }, []);

  async function save() {
    setLoading(true);
    try {
      const response = await fetch("/api/ai-management/parent-agent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        notifyError(payload.error ?? "Could not save the AI Router configuration.");
        return;
      }
      notifySuccess("AI Router configuration saved successfully.");
    } catch {
      notifyError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="parent-name">Name</Label>
        <Input
          id="parent-name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
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

      <div className="space-y-4">
        <p className="text-sm font-medium">Routing</p>

        <div className="flex items-center gap-3">
          <input
            id="automatic-routing"
            type="checkbox"
            checked={form.automatic_routing}
            onChange={(event) => setForm({ ...form, automatic_routing: event.target.checked })}
            className="size-4 accent-primary"
          />
          <Label htmlFor="automatic-routing">Automatic agent routing</Label>
        </div>

        <div className="max-w-xs space-y-2">
          <Label htmlFor="fallback-agent">Fallback agent</Label>
          <NativeSelect
            id="fallback-agent"
            value={form.fallback_agent_id ?? ""}
            onChange={(event) =>
              setForm({ ...form, fallback_agent_id: event.target.value || null })
            }
          >
            <option value="">None</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="max-w-xs space-y-2">
          <Label htmlFor="parent-status">Status</Label>
          <NativeSelect
            id="parent-status"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value as FormState["status"] })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </NativeSelect>
        </div>
      </div>

      <Button onClick={save} disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}