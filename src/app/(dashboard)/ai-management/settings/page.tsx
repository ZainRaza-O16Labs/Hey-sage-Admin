"use client";

import { useEffect, useState } from "react";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

type AiSettings = {
  default_model: string;
  default_temperature: number;
  default_top_k: number;
  similarity_threshold: number;
  memory_enabled: boolean;
};

const defaultSettings: AiSettings = {
  default_model: "gpt-4o",
  default_temperature: 0.7,
  default_top_k: 5,
  similarity_threshold: 0.7,
  memory_enabled: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AiSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai-management/settings")
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((data: { settings?: AiSettings } | null) => {
        if (data?.settings) setSettings(data.settings);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof AiSettings>(key: K, value: AiSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/ai-management/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        setMessage("Settings saved.");
      } else {
        setMessage("Settings API is not available yet. These settings require backend support.");
      }
    } catch {
      setMessage("Settings API is not available yet.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <AiPageHeader title="AI Settings" description="Global model, retrieval, memory, and execution settings." />
        <Card>
          <CardContent className="space-y-4 py-6">
            {[1, 2, 3, 4].map((i) => (
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
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <AiPageHeader
        title="AI Settings"
        description="Global model, retrieval, memory, and execution settings."
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

      <div className="flex gap-2">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {message && (
        <p className={message.includes("not available") || message.includes("not yet") ? "text-sm text-muted-foreground" : "text-sm text-muted-foreground"}>
          {message}
        </p>
      )}
    </div>
  );
}
