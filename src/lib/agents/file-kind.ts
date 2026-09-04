export type DocumentKind = "pdf" | "markdown";

const MARKDOWN_MIMES = new Set([
  "text/markdown",
  "text/x-markdown",
]);

export function detectDocumentKind(
  filename: string,
  mimeType: string,
): DocumentKind | null {
  const name = filename.toLowerCase();
  const mime = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";

  if (name.endsWith(".pdf") || mime === "application/pdf") return "pdf";
  if (name.endsWith(".md") || name.endsWith(".markdown") || MARKDOWN_MIMES.has(mime)) {
    return "markdown";
  }
  return null;
}

export function storageMimeType(kind: DocumentKind): string {
  return kind === "pdf" ? "application/pdf" : "text/markdown";
}
