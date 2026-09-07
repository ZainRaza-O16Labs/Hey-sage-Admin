import { Badge } from "@/components/ui/badge";

type StatusVariant = "active" | "inactive" | "processing" | "indexed" | "failed" | "ready" | "pending" | "error" | "draft" | "unpublished" | "published";

const statusConfig: Record<StatusVariant, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  inactive: { label: "Inactive", variant: "secondary" },
  processing: { label: "Processing", variant: "secondary" },
  indexed: { label: "Indexed", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  ready: { label: "Ready", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  error: { label: "Error", variant: "destructive" },
  draft: { label: "Draft", variant: "outline" },
  unpublished: { label: "Unpublished", variant: "secondary" },
  published: { label: "Published", variant: "default" },
};

export function AIStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as StatusVariant] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
