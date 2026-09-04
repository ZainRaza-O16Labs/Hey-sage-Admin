"use client";

import type { Agent } from "@/lib/agents/schema";
import { AgentForm } from "@/components/ai-management/agent-form";

export function AiAgentEditPage({ agent }: { agent: Agent }) {
  return <AgentForm mode="edit" agent={agent} />;
}
