"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mic, XCircle } from "lucide-react";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { notifyError, notifySuccess } from "@/lib/notify";

type AiSettings = {
  default_model: string;
  default_temperature: number;
  default_top_k: number;
  similarity_threshold: number;
  memory_enabled: boolean;
  elevenlabs_configured: boolean;
  elevenlabs_source: "env" | "database" | "not_configured";
};

const defaultSettings: AiSettings = {
  default_model: "gpt-4o",
  default_temperature: 0.7,
  default_top_k: 5,
  similarity_threshold: 0.7,
  memory_enabled: true,
  elevenlabs_configured: false,
  elevenlabs_source: "not_configured",
};

type ValidateState =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; detail: string }
  | { state: "error"; detail: string };

export default function SettingsPage() {
  const [settings, setSettings] = useState<AiSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [validate, setValidate] = useState<ValidateState>({ state: "idle" });

  useEffect(() => {
    fetch("/api/ai-management/settings")
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((data: { settings?: AiSettings } | null) => {
        if (data?.settings) {
          setSettings({
            ...defaultSettings,
            ...data.settings,
            elevenlabs_configured: data.settings.elevenlabs_configured ?? false,
            elevenlabs_source: data.settings.elevenlabs_source ?? "not_configured",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof AiSettings>(key: K, value: AiSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setValidate({ state: "idle" });
    try {
      const { elevenlabs_configured: _c, elevenlabs_source: _s, ...rest } = settings;
      const body = {
        ...rest,
        ...(elevenLabsKey.trim()
          ? { elevenlabs_api_key: elevenLabsKey.trim() }
          : {}),
      };
      const response = await fetch("/api/ai-management/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { settings?: AiSettings; error?: string };
      if (!response.ok) {
        notifyError(payload.error ?? "Could not save settings.");
        return;
      }
      if (payload.settings) setSettings(payload.settings);
      setElevenLabsKey("");
      notifySuccess("Settings saved successfully.");
    } catch {
      notifyError("Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleValidate() {
    setValidate({ state: "checking" });
    try {
      const response = await fetch("/api/ai-management/settings/elevenlabs/validate", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        detail?: string;
        subscription?: string;
        error?: string;
      };
      if (response.ok && payload.ok) {
        setValidate({
          state: "ok",
          detail: `Connected · ${payload.subscription ?? "active"} plan`,
        });
        notifySuccess("ElevenLabs connection verified.");
      } else {
        setValidate({
          state: "error",
          detail: payload.detail ?? payload.error ?? "Validation failed.",
        });
        notifyError(payload.detail ?? payload.error ?? "ElevenLabs validation failed.");
      }
    } catch {
      setValidate({ state: "error", detail: "Could not reach the validation endpoint." });
      notifyError("Could not reach the validation endpoint.");
    }
  }

  async function handleClearElevenLabs() {
    setElevenLabsKey("");
    setValidate({ state: "idle" });
    setSaving(true);
    try {
      await fetch("/api/ai-management/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elevenlabs_api_key: "" }),
      });
      const response = await fetch("/api/ai-management/settings");
      if (response.ok) {
        const data = (await response.json()) as { settings?: AiSettings };
        if (data.settings) setSettings(data.settings);
      }
      notifySuccess("ElevenLabs key removed.");
    } catch {
      notifyError("Could not remove the ElevenLabs key.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <AiPageHeader title="AI Settings" description="Global model, retrieval, memory, voice, and execution settings." />
        <Card>
          <CardContent className="space-y-4 py-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <AiPageHeader
        title="AI Settings"
        description="Global model, retrieval, memory, voice, and execution settings."
      />

      <Card>
        <CardHeader>
          <CardTitle>Model Configuration</CardTitle>
          <CardDescription>Default settings for AI model execution.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="default_model">Default Model</Label>
            <NativeSelect id="default_model" value={settings.default_model} onChange={(e) => update("default_model", e.target.value)}>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </NativeSelect>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={settings.default_temperature}
                onChange={(e) => update("default_temperature", parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Controls randomness. Higher values produce more varied outputs.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="top_k">Top K</Label>
              <Input
                id="top_k"
                type="number"
                min="1"
                max="20"
                value={settings.default_top_k}
                onChange={(e) => update("default_top_k", parseInt(e.target.value) || 5)}
              />
              <p className="text-xs text-muted-foreground">Number of similar results to retrieve for RAG.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retrieval Settings</CardTitle>
          <CardDescription>Configure how knowledge is retrieved for RAG.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="similarity">Similarity Threshold</Label>
            <Input
              id="similarity"
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={settings.similarity_threshold}
              onChange={(e) => update("similarity_threshold", parseFloat(e.target.value) || 0.7)}
            />
            <p className="text-xs text-muted-foreground">Minimum similarity score for a result to be included.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Memory</CardTitle>
          <CardDescription>Configure conversation memory settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <input
              id="memory"
              type="checkbox"
              checked={settings.memory_enabled}
              onChange={(e) => update("memory_enabled", e.target.checked)}
              className="size-4 accent-primary"
            />
            <Label htmlFor="memory">Enable conversation memory</Label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            When enabled, agents retain context from previous messages in the conversation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Mic className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Voice (ElevenLabs)</CardTitle>
              <CardDescription>One global API key powers voice for every configured agent voice.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              {settings.elevenlabs_configured ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <XCircle className="size-4 text-destructive" />
              )}
              <span className="text-muted-foreground">
                {settings.elevenlabs_source === "env"
                  ? "Configured via ELEVENLABS_API_KEY environment variable."
                  : settings.elevenlabs_source === "database"
                    ? "Configured via the admin panel (stored server-side)."
                    : "No ElevenLabs key configured. Voice falls back to Deepgram Aura."}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleValidate()}
              disabled={validate.state === "checking"}
            >
              {validate.state === "checking" ? <Loader2 className="size-4 animate-spin" /> : null}
              Validate Key
            </Button>
            {settings.elevenlabs_source === "database" && (
              <Button type="button" variant="ghost" size="sm" onClick={() => void handleClearElevenLabs()} disabled={saving}>
                Remove Key
              </Button>
            )}
          </div>

          {validate.state === "ok" && (
            <p className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="size-4" />
              {validate.detail}
            </p>
          )}
          {validate.state === "error" && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="size-4" />
              {validate.detail}
            </p>
          )}

          <div className="max-w-xl space-y-2">
            <Label htmlFor="elevenlabs_key">ElevenLabs API key</Label>
            <Input
              id="elevenlabs_key"
              type="password"
              value={elevenLabsKey}
              onChange={(e) => {
                setElevenLabsKey(e.target.value);
                setValidate({ state: "idle" });
              }}
              placeholder="sk_... (shown once at create time)"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Stored server-side only and never shown again. Agent-level voice ids are validated against this account.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
