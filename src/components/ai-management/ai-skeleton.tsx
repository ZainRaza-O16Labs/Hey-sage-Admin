import { Card, CardContent } from "@/components/ui/card";

export function AISkeleton({ rows = 5, columns = 3 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading" aria-busy="true">
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
      <Card>
        <CardContent className="p-0">
          <div className="space-y-3 p-4">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className={`grid gap-4 grid-cols-${columns}`}>
                {Array.from({ length: columns }, (_, j) => (
                  <div key={j} className="h-10 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AICardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-3 py-6">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

export function AIFormSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading form" aria-busy="true">
      <div className="space-y-2">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="h-40 w-full animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}

export function AIDetailSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading" aria-busy="true">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}
