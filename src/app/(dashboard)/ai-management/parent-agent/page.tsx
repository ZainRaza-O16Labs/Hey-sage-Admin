import { Network } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { ParentAgentForm } from "@/components/ai-management/parent-agent-form";
import { AiManagementStoreError, getParentAgentConfig } from "@/lib/ai-management/store";

export default async function ParentAgentPage() {
  let config = null;
  let errorMessage: string | null = null;
  try {
    config = await getParentAgentConfig();
  } catch (error) {
    errorMessage = error instanceof AiManagementStoreError ? error.message : "Could not load parent agent configuration.";
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <AiPageHeader
        title="Parent Agent"
        description="Configure the coordinator that receives user requests, selects a category, and delegates to a specialized agent."
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Network className="size-5 text-muted-foreground" />
          </div>
          <CardTitle>Routing configuration</CardTitle>
          <CardDescription>
            The UI stores configuration only. Routing and execution remain backend responsibilities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : (
            <ParentAgentForm initial={config} />
          )}
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>How routing works</CardTitle>
          <CardDescription>The request flow through the AI system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { step: "User Request", description: "The user sends a message or voice input" },
              { step: "Parent Agent", description: "Coordinates and selects the appropriate category" },
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
  );
}
