"use client";

import {
  CheckCircle2,
  Loader2,
  Mic,
  ShieldCheck,
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

/**
 * Single-voice editor: exactly one ElevenLabs voice per agent. The parent
 * still owns AgentVoiceRow[] (always a single element) so validation and
 * payload building stay in the form untouched.
 */
export function AgentVoicesEditor({
  rows,
  onChange,
  onVerify,
  error,
}: AgentVoicesEditorProps) {
  const row = rows[0] ?? createEmptyVoiceRow(true);
  const verified = row.status.state === "ok" && row.voiceId.trim().length > 0;

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
        the verified voice for every conversation.
      </p>

      <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
        <div className="flex items-center gap-2">
          <Input
            value={row.voiceId}
            onChange={(e) =>
              updateRow({
                voiceId: e.target.value,
                status: { state: "idle" },
              })
            }
            placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
            autoComplete="off"
            aria-label="Voice ID"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onVerify(row.localId)}
            disabled={row.status.state === "checking" || !row.voiceId.trim()}
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
            onChange={(e) => updateRow({ voiceName: e.target.value })}
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

      {error && (
        <p className={cn("text-sm text-destructive")} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}