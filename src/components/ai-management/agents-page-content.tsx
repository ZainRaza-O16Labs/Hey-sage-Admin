import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AiEmptyState } from "@/components/ai-management/ai-state";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { AgentsTable } from "@/components/ai-management/agents-table";
import { listAgents } from "@/lib/agents/store";

export async function AgentsPageContent() {
  let agents: Awaited<ReturnType<typeof listAgents>> = [];
  let errorMessage: string | null = null;

  try {
    agents = await listAgents();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load agents.";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AiPageHeader
        title="Agents"
        description="Manage permanent AI agents, instructions, status, and knowledge files."
        action={<Button nativeButton={false} render={<Link href="/agents/new" />}><Plus className="size-4" />Create Agent</Button>}
      />

      {errorMessage ? <Card><CardContent className="py-8"><p className="text-sm text-destructive">{errorMessage}</p></CardContent></Card> : agents.length === 0 ? <Card><CardContent><AiEmptyState title="No agents found" description="You haven't created any agents yet. Create your first agent to get started." actionHref="/agents/new" actionLabel="Create Agent" /></CardContent></Card> : <Card><CardContent className="p-0"><AgentsTable agents={agents} /></CardContent></Card>}
    </div>
  );
}
