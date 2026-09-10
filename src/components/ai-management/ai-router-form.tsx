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
    <div className="space-y-7">
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Identity</h3>
          <p className="mt-1 text-sm text-muted-foreground">This name is shown to administrators when reviewing routing activity.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="parent-name">Router name</Label>
        <Input
          id="parent-name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="e.g. Main support coordinator"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="parent-description">Purpose</Label>
        <Input
          id="parent-description"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="A brief description of this router’s responsibility"
        />
      </div>
      </section>

      <section className="space-y-4 border-t pt-6">
        <div>
          <h3 className="text-sm font-medium">Routing guidance</h3>
          <p className="mt-1 text-sm text-muted-foreground">Tell the router how to identify the right category and specialist for each request.</p>
        </div>
        <div className="space-y-2">
        <Label htmlFor="parent-instructions">Instructions</Label>
        <Textarea
          id="parent-instructions"
          rows={11}
          value={form.instructions}
          onChange={(event) => setForm({ ...form, instructions: event.target.value })}
          placeholder="Identify the most appropriate category for each request, then select an active specialist agent. Ask a clarifying question when the request cannot be safely classified."
        />
        <p className="text-xs text-muted-foreground">Include routing boundaries, priority rules, and what to do when a request is ambiguous.</p>
        </div>
      </section>

      <section className="space-y-4 border-t pt-6">
        <div>
          <h3 className="text-sm font-medium">Runtime behavior</h3>
          <p className="mt-1 text-sm text-muted-foreground">Control automatic delegation and the recovery path for unmatched requests.</p>
        </div>

        <label htmlFor="automatic-routing" className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
          <input
            id="automatic-routing"
            type="checkbox"
            checked={form.automatic_routing}
            onChange={(event) => setForm({ ...form, automatic_routing: event.target.checked })}
            className="size-4 accent-primary"
          />
          <span>
            <span className="block text-sm font-medium">Automatic agent routing</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Let the router delegate directly to the best matching active agent.</span>
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
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
          <p className="text-xs text-muted-foreground">Used when no specialist can be selected.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="parent-status">Status</Label>
          <NativeSelect
            id="parent-status"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value as FormState["status"] })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </NativeSelect>
          <p className="text-xs text-muted-foreground">Inactive routers cannot receive new requests.</p>
        </div>
        </div>
      </section>

      <div className="flex items-center justify-between border-t pt-5">
        <p className="text-xs text-muted-foreground">Changes apply to future routed conversations.</p>
      <Button onClick={save} disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </Button>
      </div>
    </div>
  );
}
