"use client";

export default function AgentsError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-xl border bg-card p-6">
      <h1 className="text-lg font-semibold">Agents</h1>
      <p className="mt-2 text-sm text-destructive">{error.message}</p>
    </div>
  );
}
