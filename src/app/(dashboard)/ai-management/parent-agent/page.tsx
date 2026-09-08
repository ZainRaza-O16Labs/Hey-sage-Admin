import { Route } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
              <AiRouterForm initial={config} categories={categories} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How routing works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { step: "User Request", description: "The user sends a message or voice input" },
                { step: "AI Router", description: "Coordinates and selects the appropriate category" },
                { step: "Category", description: "Routes to a specialized domain of agents" },
                { step: "Specialized Agent", description: "Processes the request with tools and knowledge" },
              ].map((item, index) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.step}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
