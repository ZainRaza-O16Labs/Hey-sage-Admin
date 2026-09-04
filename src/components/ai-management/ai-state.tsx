import Link from "next/link";
import { AlertCircle, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AiEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Plus className="size-5" />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionHref && actionLabel ? (
        <Button className="mt-5" nativeButton={false} render={<Link href={actionHref} />}>
          <Plus className="size-4" />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function AiErrorState({
  description = "Unable to load this data.",
  onRetry,
}: {
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-14 text-center">
        <AlertCircle className="size-6 text-destructive" />
        <h2 className="mt-3 text-base font-semibold">Something went wrong</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {onRetry ? (
          <Button className="mt-5" variant="outline" onClick={onRetry}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AiTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-6" aria-label="Loading">
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="grid grid-cols-3 gap-4">
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-10 animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}
