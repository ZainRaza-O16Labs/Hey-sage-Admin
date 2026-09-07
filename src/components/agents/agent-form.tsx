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
import { fetchCategories } from "@/lib/ai-management/categories";

type AgentFormInput = Omit<AgentInput, "configuration"> & {
  configuration?: Record<string, unknown>;
};

const emptyForm: AgentFormInput = {
  name: "",
  description: "",
  instructions: "",
  status: "active",
  lifecycle_status: "draft",
  category_id: null,
  voice_id: null,
  voice_name: null,
  model: "gpt-5",
  temperature: 0.2,
  configuration: {},
};

type CategoryOption = { value: string; label: string };

export function AgentForm({ mode, agent }: { mode: "create" | "edit"; agent?: Agent }) {
  const router = useRouter();
  const [form, setForm] = useState<AgentFormInput>(
    agent
      ? {
          name: agent.name,
          description: agent.description,
          instructions: agent.instructions,
          status: agent.status,
          lifecycle_status: agent.lifecycle_status,
          category_id:
            agent.category_id !== null
              ? typeof agent.category_id === "string"
                ? agent.category_id
                : null
                : null,
          voice_id: agent.voice_id ?? null,
          voice_name: agent.voice_name ?? null,
          model: agent.model ?? "gpt-5",
          temperature:
            typeof agent.temperature === "number" ? agent.temperature : 0.2,
          configuration: agent.configuration ?? {},
        }
      : emptyForm
  );
  const [errors, setErrors] = useState<Partial<Record<keyof AgentFormInput, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [fetchingCategories, setFetchingCategories] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      setFetchingCategories(true);
      try {
        const data = await fetchCategories();
        const catList = data?.map((c: { id: string; name: string }) => ({
          value: c.id,
          label: c.name,
        })) ?? [];
        setCategories(catList);
      } catch {
        // ignore
      } finally {
        setFetchingCategories(false);
      }
    }
    fetchCategories();
  }, []);

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
        router.push(`/ai-management/agents/${payload.agent.id}`);
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
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="Sage"
          aria-invalid={Boolean(errors.name)}
          required
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="Short internal label for this agent"
          aria-invalid={Boolean(errors.description)}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          name="instructions"
          value={form.instructions}
          onChange={(event) => setForm({ ...form, instructions: event.target.value })}
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

      <div className="flex items-center gap-3">
        <input
          id="automatic-selection"
          type="checkbox"
          checked={form.automatic_selection !== false}
          onChange={(event) =>
            setForm({ ...form, automatic_selection: event.target.checked })
          }
          className="size-4 accent-primary"
        />
        <Label htmlFor="automatic-selection">Automatic agent selection</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        {fetchingCategories ? (
          <div className="h-10 rounded bg-muted/20 flex items-center justify-center text-xs text-muted-foreground">
            Loading categories…
          </div>
        ) : categories.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No categories available. Category assignment will be set to null.
          </p>
        ) : (
          <NativeSelect
            id="category"
            name="category_id"
            value={form.category_id ?? ""}
            onChange={(event) =>
              setForm({
                ...form,
                category_id:
                  event.target.value === "" ? null : event.target.value,
              })
            }
          >
            <option value="">—</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </NativeSelect>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="lifecycle_status">Lifecycle Status</Label>
        <NativeSelect
          id="lifecycle_status"
          name="lifecycle_status"
          value={form.lifecycle_status}
          onChange={(event) =>
            setForm({ ...form, lifecycle_status: event.target.value as AgentInput["lifecycle_status"] })
          }
        >
          <option value="draft">Draft</option>
          <option value="unpublished">Unpublished</option>
          <option value="published">Published</option>
        </NativeSelect>
        <p className="text-xs text-muted-foreground">
          Draft = works in preview only • Unpublished = not available to clients •
          Published = available to web and mobile clients
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <NativeSelect
            id="model"
            name="model"
            value={form.model}
            onChange={(event) => setForm({ ...form, model: event.target.value })}
          >
            <option value="gpt-5">GPT-5</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-4.1">GPT-4.1</option>
            <option value="claude-sonnet-4">Claude Sonnet 4</option>
            <option value="claude-opus-4">Claude Opus 4</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="temperature">Temperature</Label>
          <Input
            id="temperature"
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={form.temperature}
            onChange={(event) =>
              setForm({ ...form, temperature: parseFloat(event.target.value) || 0.2 })
            }
          />
          <p className="text-xs text-muted-foreground">
            Controls randomness. Higher values produce more varied outputs.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="voice_id">Voice ID</Label>
        <Input
          id="voice_id"
          name="voice_id"
          value={form.voice_id ?? ""}
          onChange={(event) =>
            setForm({ ...form, voice_id: event.target.value || null })
          }
          placeholder="sk_..."
          aria-invalid={Boolean(errors.voice_id)}
        />
        <p className="text-xs text-muted-foreground">
          Agent-level voice. Overrides the global ElevenLabs key voice.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="voice_name">Voice Name</Label>
        <Input
          id="voice_name"
          name="voice_name"
          value={form.voice_name ?? ""}
          onChange={(event) => setForm({ ...form, voice_name: event.target.value }) }
          placeholder="e.g., Sage"
          aria-invalid={Boolean(errors.voice_name)}
        />
        <p className="text-xs text-muted-foreground">
          Human-readable name for the voice.
        </p>
      </div>

      <div className="max-w-xs space-y-2">
        <Label htmlFor="status">Status</Label>
        <NativeSelect
          id="status"
          name="status"
          value={form.status}
          onChange={(event) =>
            setForm({ ...form, status: event.target.value as AgentInput["status"] })
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
            render={<Link href="/ai-management/agents" />}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}