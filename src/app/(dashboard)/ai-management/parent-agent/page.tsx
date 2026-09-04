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

  return <div className="mx-auto flex max-w-6xl flex-col gap-6">
    <AiPageHeader title="Parent Agent" description="Configure the coordinator that selects a category and delegates to a permanent agent." />
    {errorMessage ? <Card><CardContent className="py-8"><p className="text-sm text-destructive">{errorMessage}</p></CardContent></Card> : <Card className="max-w-3xl"><CardHeader><div className="flex size-10 items-center justify-center rounded-lg bg-muted"><Network className="size-5 text-muted-foreground" /></div><CardTitle>Routing configuration</CardTitle><CardDescription>The UI stores configuration only. Routing and execution remain backend responsibilities.</CardDescription></CardHeader><CardContent><ParentAgentForm initial={config} /></CardContent></Card>}
  </div>;
}
