import Link from "next/link";
import { ArrowRight, Bot, Check, CircleAlert, Route, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AiRouterForm } from "@/components/ai-management/ai-router-form";
import { AIStatusBadge } from "@/components/ai-management/ai-status-badge";
import { AiManagementStoreError, getParentAgentConfig, listCategories } from "@/lib/ai-management/store";
import { listAgents } from "@/lib/agents/store";

export default async function AiRouterPage() {
  let config = null;
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  let agents: Awaited<ReturnType<typeof listAgents>> = [];
  let errorMessage: string | null = null;
  try {
    [config, categories] = await Promise.all([
      getParentAgentConfig(),
      listCategories(),
    ]);
  } catch (error) {
    errorMessage = error instanceof AiManagementStoreError ? error.message : "Could not load AI Router configuration.";
  }
  try {
    agents = await listAgents();
  } catch {
    // Agent availability is supplemental; configuration must remain usable.
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <AiPageHeader
        title="AI Router"
        description="Set the rules for how incoming requests are classified, delegated, and recovered when no specialist is a clear match."
      />

      {/* <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="flex items-center gap-2 font-medium"><Route className="size-4 text-primary" /> Incoming request</span>
            <ArrowRight className="size-4 text-muted-foreground" />
            <span className="font-medium">AI Router</span>
            <ArrowRight className="size-4 text-muted-foreground" />
            <span className="font-medium">Category</span>
            <ArrowRight className="size-4 text-muted-foreground" />
            <span className="flex items-center gap-2 font-medium"><Bot className="size-4 text-muted-foreground" /> Specialist agent</span>
          </div>
        </CardContent>
      </Card> */}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.85fr)]">
        <Card>
          <CardHeader className="border-b">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings2 className="size-5" />
            </div>
            <CardTitle className="mt-2">Router configuration</CardTitle>
            <CardDescription>Define the coordinator’s identity, routing guidance, and safe fallback behavior.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : (
              <AiRouterForm initial={config} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Routing destinations</CardTitle>
                <CardDescription className="mt-1">Configured categories and the specialist capacity behind each one.</CardDescription>
              </div>
              <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/ai-management/categories/new" />}>
                New Category
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {categories.length === 0 ? (
              <div className="rounded-lg border border-dashed p-5 text-center">
                <CircleAlert className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No routing destinations yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Create a category before enabling automatic routing.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {categories.map((category) => {
                  const categoryAgents = agents.filter((agent) => agent.category_id === category.id);
                  const activeAgents = categoryAgents.filter((agent) => agent.status === "active").length;
                  return (
                    <li key={category.id}>
                      <Link
                        href={`/ai-management/categories/${category.id}`}
                        className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/60"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-background"><Check className="size-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{category.name}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {activeAgents} active {activeAgents === 1 ? "agent" : "agents"}
                            {categoryAgents.length !== activeAgents && ` · ${categoryAgents.length - activeAgents} inactive`}
                          </span>
                        </span>
                        <AIStatusBadge status={category.status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
