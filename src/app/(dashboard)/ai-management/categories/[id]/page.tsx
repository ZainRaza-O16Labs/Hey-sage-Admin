import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AIStatusBadge } from "@/components/ai-management/ai-status-badge";
import { AiManagementStoreError, getCategory } from "@/lib/ai-management/store";

type RouteParams = Promise<{ id: string }>;

export default async function CategoryDetailPage({ params }: { params: RouteParams }) {
  const { id } = await params;

  let category;
  try {
    category = await getCategory(id);
  } catch (error) {
    if (error instanceof AiManagementStoreError && error.status === 404) {
      notFound();
    }
    notFound();
  }
  if (!category) notFound();

  const editHref = `/ai-management/categories/${category.id}/edit`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AiPageHeader
          title={category.name}
          description={category.description || "No description provided."}
          action={
            <Button variant="outline" nativeButton={false} render={<Link href={editHref} />}>
              <Edit className="size-4" />
              Edit Category
            </Button>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
          <CardDescription>Configuration and instructions for this category.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Status</span>
            <AIStatusBadge status={category.status} />
          </div>
          {category.description && (
            <div>
              <p className="text-sm font-medium">Description</p>
              <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
            </div>
          )}
          {category.instructions && (
            <div>
              <p className="text-sm font-medium">Instructions</p>
              <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground">
                {category.instructions}
              </pre>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Created</p>
              <p className="mt-1 text-sm text-muted-foreground">{new Date(category.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Updated</p>
              <p className="mt-1 text-sm text-muted-foreground">{new Date(category.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agents in this Category</CardTitle>
          <CardDescription>Specialized agents that belong to this category.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Bot className="size-5" />
            </div>
            <p className="text-sm font-medium">Agent assignment not yet available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Agent-to-category assignment will be available once the backend schema supports it.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
