import { notFound } from "next/navigation";
import { AgentDocuments } from "@/components/agents/agent-documents";
import { AgentForm } from "@/components/agents/agent-form";
import { AgentStatusPoller } from "@/components/agents/agent-status-poller";
import { DeleteAgentButton } from "@/components/agents/delete-agent-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listDocuments } from "@/lib/agents/documents";
import { getAgent } from "@/lib/agents/store";
import { isUuid } from "@/lib/agents/schema";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }

  let agent;
  try {
    agent = await getAgent(id);
  } catch {
    notFound();
  }
  if (!agent) {
    notFound();
  }

  const documents = await listDocuments(id);
  const processing = documents.some(
    (document) =>
      document.status === "pending" || document.status === "processing",
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <AgentStatusPoller active={processing} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{agent.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure identity, paste instructions manually, and attach knowledge
            files for RAG.
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Agent ID: {agent.id}
          </p>
        </div>
        <DeleteAgentButton id={agent.id} name={agent.name} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent</CardTitle>
          <CardDescription>
            Name, description, instructions, and status. Clients pass this
            agent&apos;s ID when starting a chat or voice session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgentForm mode="edit" agent={agent} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge</CardTitle>
          <CardDescription>
            Upload PDF or Markdown for retrieval. Files are extracted and stored
            for future RAG — they do not auto-generate instructions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgentDocuments agentId={agent.id} documents={documents} />
        </CardContent>
      </Card>
    </div>
  );
}
