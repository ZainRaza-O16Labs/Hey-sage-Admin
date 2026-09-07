import type { Agent } from "@/lib/agents/schema";
import { listAgents, getAgent } from "@/lib/agents/store";
import { requireStore } from "@/lib/ai-management/store";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/ai-management/store";

export type RouteParams = Promise<{ id: string }>;

export async function listEligibleCategories(): Promise<{
  id: string;
  name: string;
  description: string;
}[]> {
  const { data, error } = await requireStore()
    .from("ai_categories")
    .select("*")
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .eq("status", "active")
    .order("name");

  if (error) throw new Error("Failed to load eligible categories");

  return (data ?? []).map((cat: Record<string, unknown>) => ({
    id: String(cat.id),
    name: String(cat.name ?? ""),
    description: String(cat.description ?? ""),
  }));
}

export async function routeMessageToAgent(
  message: string
): Promise<{
  agent: import("@/lib/agents/schema").Agent | null;
  category: { id: string; name: string; description: string } | null;
  reason?: string;
  fallback: boolean;
}> {
  const eligibleCategories = await listEligibleCategories();

  if (eligibleCategories.length === 0) {
    return {
      agent: null,
      category: null,
      reason: "No eligible categories found. Please configure at least one active category.",
      fallback: true,
    };
  }

  // Simple keyword matching heuristic
  let selectedCategory: { id: string; name: string; description: string } | null = null;
  const messageLower = message.toLowerCase();

  for (const cat of eligibleCategories) {
    const nameMatch = cat.name.toLowerCase().includes(messageLower);
    const descMatch = cat.description.toLowerCase().includes(messageLower);
    if (nameMatch || descMatch) {
      selectedCategory = cat;
      break;
    }
  }

  // Default to first eligible category
  if (!selectedCategory) {
    selectedCategory = eligibleCategories[0];
  }

  // Resolve agent by category
  let agent: import("@/lib/agents/schema").Agent | null = null;
  let resolutionReason: string | undefined = undefined;

  if (selectedCategory) {
    try {
      const categoryAgent = await getAgentByCategory(selectedCategory.id);

      if (categoryAgent) {
        const isPublished = categoryAgent.lifecycle_status === "published";
        const isActive = categoryAgent.status === "active";

        if (isPublished && isActive) {
          agent = categoryAgent;
          resolutionReason = "Category matched and agent is production eligible.";
        } else {
          resolutionReason = `Category "${selectedCategory.name}" has agents, but the matching agent is not yet published/active. `;
        }
      }
    } catch {
      // Category exists but agent lookup failed
    }
  }

  // Fallback to configured fallback agent
  if (!agent) {
    try {
      const { data, error } = await requireStore()
        .from("ai_parent_agent_config")
        .select("fallback_agent_id")
        .eq("organization_id", DEFAULT_ORGANIZATION_ID)
        .maybeSingle();

      if (!error && data?.fallback_agent_id) {
        const fallbackAgent = await getAgent(data.fallback_agent_id);
        if (fallbackAgent && fallbackAgent.lifecycle_status === "published" && fallbackAgent.status === "active") {
          agent = fallbackAgent;
          resolutionReason = "Using configured fallback agent.";
        }
      }
    } catch {
      // Fallback config not available
    }
  }

  // If still no agent, return controlled fallback
  if (!agent) {
    return {
      agent: null,
      category: selectedCategory,
      reason: resolutionReason || "Could not resolve a production-eligible agent. Using fallback response.",
      fallback: true,
    };
  }

  return {
    agent,
    category: selectedCategory,
    reason: resolutionReason,
    fallback: false,
  };
}

async function getAgentByCategory(categoryId: string): Promise<import("@/lib/agents/schema").Agent | null> {
  try {
    const agents = await listAgents();
    const matchingAgents = agents.filter((agent) => agent.category_id === categoryId);

    if (matchingAgents.length === 0) {
      return null;
    }

    return matchingAgents[0];
  } catch {
    return null;
  }
}
