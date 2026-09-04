"use client";

import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type AiMessageBannerProps = {
  kind: "success" | "error";
  children: React.ReactNode;
  onDismiss?: () => void;
};

export function AiMessageBanner({ kind, children, onDismiss }: AiMessageBannerProps) {
  const Icon = kind === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
        kind === "success"
          ? "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
