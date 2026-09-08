import { notFound } from "next/navigation";
import { Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackNav } from "@/components/ai-management/back-nav";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AiManagementStoreError, getCategory } from "@/lib/ai-management/store";

type RouteParams = Promise<{ id: string }>;

export default async function CategoryKnowledgePage({ params }: { params: RouteParams }) {
  const { id } = await params;

  let category;
  try {
    category = await getCategory(id);
  } catch (error) {
    if (error instanceof AiManagementStoreError && error.status === 404) notFound();
    notFound();
  }
  if (!category) notFound();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <BackNav href={`/ai-management/categories/${id}`} label="Category" />
      <AiPageHeader
        title={`${category.name} — Knowledge`}
        description="Manage knowledge bases shared across agents in this category."
      />

      <Card>
        <CardHeader>
          <CardTitle>Category Knowledge</CardTitle>
          <CardDescription>Knowledge bases shared across all agents in this category. This is distinct from agent-specific knowledge.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Database className="size-5" />
            </div>
            <p className="text-sm font-medium">Category knowledge not yet available</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Category-level knowledge assignment will be available once the backend schema supports linking knowledge bases to categories.
              Currently, knowledge documents are managed at the agent level.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
