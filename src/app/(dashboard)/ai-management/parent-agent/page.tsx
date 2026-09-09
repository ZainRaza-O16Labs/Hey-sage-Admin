import Link from "next/link";
import { Check, Route } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AiRouterForm } from "@/components/ai-management/ai-router-form";
import { AiManagementStoreError, getParentAgentConfig, listCategories } from "@/lib/ai-management/store";

export default async function AiRouterPage() {
  let config = null;
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  let errorMessage: string | null = null;
  try {
    [config, categories] = await Promise.all([
      getParentAgentConfig(),
      listCategories(),
    ]);
  } catch (error) {
    errorMessage = error instanceof AiManagementStoreError ? error.message : "Could not load AI Router configuration.";
  }

  return (
    <div className="flex flex-col gap-6">
      <AiPageHeader
        title="AI Router"
        description="Configure the coordinator that receives user requests, selects a category, and delegates to a specialized agent."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Route className="size-5 text-muted-foreground" />
            </div>
            <CardTitle>Routing configuration</CardTitle>
          </CardHeader>
          <CardContent>
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : (
              <AiRouterForm initial={config} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Available Categories</CardTitle>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/ai-management/categories/new" />}
            >
              New Category
            </Button>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No categories yet. Create a category so the AI Router can delegate requests.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Category
                </p>
                <ul className="space-y-2">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <Link
                        href={`/ai-management/categories/${category.id}`}
                        className="flex items-center gap-2 text-sm hover:underline"
                      >
                        <Check className="size-4 shrink-0 text-muted-foreground" />
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
