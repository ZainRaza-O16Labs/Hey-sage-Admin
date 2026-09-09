/** Shared helpers for scope-canonical AI schema fields. */

export function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "item";
}

export function uniqueSlug(input: string, idHint?: string): string {
  const base = slugify(input);
  const suffix = (idHint ?? crypto.randomUUID()).replace(/-/g, "").slice(0, 8);
  return `${base}-${suffix}`;
}

export const DOCUMENT_STATUSES = [
  "uploading",
  "processing",
  "indexed",
  "failed",
] as const;

export type ScopeDocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export function isScopeDocumentStatus(
  value: string,
): value is ScopeDocumentStatus {
  return (DOCUMENT_STATUSES as readonly string[]).includes(value);
}

/** Map legacy document statuses to scope vocabulary (read-path safety). */
export function normalizeDocumentStatus(value: string): ScopeDocumentStatus {
  if (value === "ready") return "indexed";
  if (value === "error") return "failed";
  if (value === "pending") return "uploading";
  if (isScopeDocumentStatus(value)) return value;
  return "uploading";
}
