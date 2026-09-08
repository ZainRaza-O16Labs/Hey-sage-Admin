"use client";

import {
  CheckCircle2,
  Loader2,
  Mic,
  Plus,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type VoiceRowStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok" }
  | { state: "error"; detail: string };

export type AgentVoiceRow = {
  localId: string;
  voiceId: string;
  voiceName: string;
  isDefault: boolean;
  status: VoiceRowStatus;
};

type AgentVoicesEditorProps = {
  rows: AgentVoiceRow[];
  onChange: (rows: AgentVoiceRow[]) => void;
  onVerify: (localId: string) => void;
  error?: string;
};

export function createEmptyVoiceRow(isDefault = false): AgentVoiceRow {
  return {
    localId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `voice-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    voiceId: "",
    voiceName: "",
    isDefault,
    status: { state: "idle" },
  };
}

export function AgentVoicesEditor({
  rows,
  onChange,
  onVerify,
  error,
}: AgentVoicesEditorProps) {
  function updateRow(localId: string, patch: Partial<AgentVoiceRow>) {
    onChange(
      rows.map((row) => (row.localId === localId ? { ...row, ...patch } : row)),
    );
  }

  function setDefault(localId: string) {
    onChange(
      rows.map((row) => ({
        ...row,
        isDefault: row.localId === localId,
      })),
    );
  }

  function removeRow(localId: string) {
    const remaining = rows.filter((row) => row.localId !== localId);
    if (remaining.length === 0) {
      onChange([createEmptyVoiceRow(true)]);
      return;
    }
    const removedWasDefault = rows.find((row) => row.localId === localId)?.isDefault;
    if (removedWasDefault && !remaining.some((row) => row.isDefault)) {
      const nextDefault =
        remaining.find((row) => row.status.state === "ok") ?? remaining[0]!;
      onChange(
        remaining.map((row) => ({
          ...row,
          isDefault: row.localId === nextDefault.localId,
        })),
      );
      return;
    }
    onChange(remaining);
  }

  function addRow() {
    onChange([...rows, createEmptyVoiceRow(rows.length === 0)]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mic className="size-4 text-muted-foreground" />
        <Label className="text-base font-medium">Agent Voices</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Add one or more ElevenLabs voices for this agent. Mark exactly one as
        default — runtime uses the default verified voice.
      </p>

      <div className="space-y-3">
        {rows.map((row, index) => {
          const verified =
            row.status.state === "ok" && row.voiceId.trim().length > 0;
          return (
            <div
              key={row.localId}
              className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="agent-default-voice"
                    checked={row.isDefault}
                    onChange={() => setDefault(row.localId)}
                    disabled={!verified && rows.length > 1}
                    className="size-4 accent-foreground"
                  />
                  <span className="font-medium">
                    {row.voiceName.trim() ||
                      row.voiceId.trim() ||
                      `Voice ${index + 1}`}
                    {row.isDefault ? " (default)" : ""}
                  </span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(row.localId)}
                  disabled={rows.length === 1 && !row.voiceId.trim()}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={row.voiceId}
                  onChange={(e) =>
                    updateRow(row.localId, {
                      voiceId: e.target.value,
                      status: { state: "idle" },
                    })
                  }
                  placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
                  autoComplete="off"
                  aria-label={`Voice ID ${index + 1}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onVerify(row.localId)}
                  disabled={
                    row.status.state === "checking" || !row.voiceId.trim()
                  }
                  className="shrink-0"
                >
                  {row.status.state === "checking" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : verified ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  {row.status.state === "checking"
                    ? "Verifying..."
                    : verified
                      ? "Verified"
                      : "Verify"}
                </Button>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`voice-name-${row.localId}`} className="text-xs">
                  Voice Name
                </Label>
                <Input
                  id={`voice-name-${row.localId}`}
                  value={row.voiceName}
                  onChange={(e) =>
                    updateRow(row.localId, { voiceName: e.target.value })
                  }
                  placeholder="Optional display name"
                />
              </div>

              {row.status.state === "ok" && (
                <p className="flex items-center gap-1.5 text-sm text-emerald-600">
                  <CheckCircle2 className="size-4" />
                  Voice ID Verified
                </p>
              )}
              {row.status.state === "error" && (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <XCircle className="size-4" />
                  {row.status.detail}
                </p>
              )}
              {row.status.state === "checking" && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Verifying Voice ID against ElevenLabs...
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="size-4" />
        Add Voice
      </Button>

      {error && (
        <p className={cn("text-sm text-destructive")} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
