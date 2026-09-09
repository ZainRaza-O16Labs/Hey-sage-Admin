"use client";

import { Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type AgentVoiceRow = {
  localId: string;
  voiceId: string;
  voiceName: string;
  isDefault: boolean;
};

type AgentVoicesEditorProps = {
  rows: AgentVoiceRow[];
  onChange: (rows: AgentVoiceRow[]) => void;
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
  };
}

/**
 * Single-voice editor: exactly one ElevenLabs voice per agent. Only the Voice
 * ID and Voice Name are configured. The parent still owns AgentVoiceRow[]
 * (always a single element) so validation and payload building stay in the
 * form untouched.
 */
export function AgentVoicesEditor({
  rows,
  onChange,
  error,
}: AgentVoicesEditorProps) {
  const row = rows[0] ?? createEmptyVoiceRow(true);

  function updateRow(patch: Partial<AgentVoiceRow>) {
    onChange([{ ...row, ...patch }]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mic className="size-4 text-muted-foreground" />
        <Label className="text-base font-medium">Agent Voice</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Configure the single ElevenLabs voice used by this agent. Runtime uses
        this voice for every conversation.
      </p>

      <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
        <div className="space-y-1">
          <Label htmlFor={`voice-id-${row.localId}`} className="text-xs">
            Voice ID
          </Label>
          <Input
            id={`voice-id-${row.localId}`}
            value={row.voiceId}
            onChange={(e) => updateRow({ voiceId: e.target.value })}
            placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
            autoComplete="off"
            aria-label="Voice ID"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`voice-name-${row.localId}`} className="text-xs">
            Voice Name
          </Label>
          <Input
            id={`voice-name-${row.localId}`}
            value={row.voiceName}
            onChange={(e) => updateRow({ voiceName: e.target.value })}
            placeholder="Optional display name"
          />
        </div>
      </div>

      {error && (
        <p className={cn("text-sm text-destructive")} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}