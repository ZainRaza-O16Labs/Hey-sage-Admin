import Link from "next/link";
import { notFound } from "next/navigation";
import { Database, Edit, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AIStatusBadge } from "@/components/ai-management/ai-status-badge";
import { AiKnowledgeBaseDocumentsPanel } from "@/components/ai-management/ai-knowledge-base-documents-panel";
import {
  getKnowledgeBase,
  getKnowledgeBaseStats,
} from "@/lib/ai-management/store";
import { listKnowledgeBaseDocuments } from "@/lib/ai-management/knowledge-base-documents";
import { isUuid } from "@/lib/agents/schema";

type RouteParams = Promise<{ id: string }>;

export default async function KnowledgeBaseDetailPage({ params }: { params: RouteParams }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  let kb;
  try {
    kb = await getKnowledgeBase(id);
  } catch {
    notFound();
  }

  const [stats, documents] = await Promise.all([
    getKnowledgeBaseStats(id),
    listKnowledgeBaseDocuments(id),
  ]);
  const editHref = "/ai-management/knowledge-bases/" + kb.id + "/edit";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AiPageHeader
          title={kb.name}
          description={kb.description || "Knowledge base for document management."}
          action={
            <Button variant="outline" nativeButton={false} render={<Link href={editHref} />}>
              <Edit className="size-4" />
              Edit
            </Button>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Database className="size-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>Details</CardTitle>
                <CardDescription>Configuration and status.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <AIStatusBadge status={kb.status} />
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="mt-1 text-sm text-muted-foreground">{new Date(kb.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Updated</p>
                <p className="mt-1 text-sm text-muted-foreground">{new Date(kb.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
            <CardDescription>Resource counts for this knowledge base.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm">Documents</span>
              <Badge variant={stats.documentCount > 0 ? "default" : "secondary"}>{stats.documentCount}</Badge>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm">Ready documents</span>
              <Badge variant={stats.readyDocumentCount > 0 ? "default" : "secondary"}>{stats.readyDocumentCount}</Badge>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm">Assigned Agents</span>
              <Badge variant={stats.agentCount > 0 ? "default" : "secondary"}>{stats.agentCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Chunks</span>
              <Badge variant={stats.chunkCount > 0 ? "default" : "secondary"}>{stats.chunkCount}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Files uploaded to this knowledge base.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AiKnowledgeBaseDocumentsPanel
            knowledgeBaseId={id}
            initialDocuments={documents}
          />
        </CardContent>
      </Card>
    </div>
  );
}