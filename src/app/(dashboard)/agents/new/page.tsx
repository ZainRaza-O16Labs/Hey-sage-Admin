import { AgentForm } from "@/components/agents/agent-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewAgentPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Agent</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Name, description, one instruction, and status. Agents are stored in
          the database and run dynamically through Mastra — no Mastra Console
          setup required.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Agent</CardTitle>
          <CardDescription>
            All fields are saved to the agents table. Web and mobile clients
            select this agent by ID at runtime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgentForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
