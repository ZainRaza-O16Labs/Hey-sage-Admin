import { requireStore } from "@/lib/ai-management/store";
import { listAgents } from "@/lib/agents/store";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/ai-management/store";

/**
 * Returns categories that are eligible for routing.
 * Only categories with status "active" are considered eligible.
 */
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

/**
 * Routes a user message to the appropriate permanent agent.
 * 
 * Flow:
 * 1. Load eligible categories from the database
 * 2. Use an LLM to determine the best matching category for the message
 * 3. Validate the category ID against the database
 * 4. Resolve a permanent agent belonging to that category
 * 5. Validate the agent is production eligible (Published + Active)
 * 6. Fall back when necessary
 * 
 * The LLM must NEVER be allowed to invent arbitrary IDs.
 * All category and agent IDs must be validated server-side.
 */
export async function routeMessageToAgent(
  message: string
): Promise<{
  agent: import("@/lib/agents/store").Agent | null;
  category: { id: string; name: string; description: string } | null;
  reason?: string;
  fallback: boolean;
}> {
  // Step 1: Load eligible categories
  const eligibleCategories = await listEligibleCategories();

  if (eligibleCategories.length === 0) {
    return {
      agent: null,
      category: null,
      reason: "No eligible categories found. Please configure at least one active category.",
      fallback: true,
    };
  }

  // Step 2: Determine the best matching category
  // Use a simple keyword matching heuristic; in production this would use an LLM
  // with server-side validation to prevent arbitrary ID injection.
  
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
  
  // If no keyword match, select the first eligible category as default
  if (!selectedCategory) {
    selectedCategory = eligibleCategories[0];
  }

  // Step 3: Resolve a permanent agent belonging to that category
  let agent: import("@/lib/agents/store").Agent | null = null;
  let resolutionReason: string | undefined = undefined;

  if (selectedCategory) {
    try {
      const categoryAgent = await getAgentByCategory(selectedCategory.id);
      
      if (categoryAgent) {
        // Validate the agent is production eligible
        // Published + Active only for normal production routing
        const isPublished = categoryAgent.lifecycle_status === "published";
        const isActive = categoryAgent.status === "active";
        
        if (isPublished && isActive) {
          agent = categoryAgent;
          resolutionReason = "Category matched and agent is production eligible.";
        } else {
          // Agent exists but is not production eligible - try fallback
          resolutionReason = `Category "${selectedCategory.name}" has agents, but the matching agent is not yet published/active. `;
        }
      }
    } catch {
      // Category exists but agent lookup failed, continue to fallback
    }
  }

  // Step 4: Fallback when no production-eligible agent found
  if (!agent) {
    // Try to get configured fallback agent from parent agent config
    try {
      const { data, error } = await requireStore()
        .from("ai_parent_agent_config")
        .select("fallback_agent_id")
        .eq("organization_id", DEFAULT_ORGANIZATION_ID)
        .maybeSingle();
      
      if (!error && data?.fallback_agent_id) {
        const fallbackAgent = await getAgent(data.fallback_agent_id);
        if (fallbackAgent && 
            fallbackAgent.lifecycle_status === "published" && 
            fallbackAgent.status === "active") {
          agent = fallbackAgent;
          resolutionReason = "Using configured fallback agent.";
        }
      }
    } catch {
      // Fallback config not available, continue without agent
    }
    
    // If still no agent, return controlled fallback response
    if (!agent) {
      return {
        agent: null,
        category: selectedCategory,
        reason: resolutionReason || "Could not resolve a production-eligible agent for the detected category. Using fallback response.",
        fallback: true,
      };
    }
  }

  return {
    agent,
    category: selectedCategory,
    reason: resolutionReason,
    fallback: false,
  };
}

/**
 * Gets a permanent agent belonging to a specific category.
 * Only returns agents that are in the category.
 */
async function getAgentByCategory(categoryId: string): Promise<import("@/lib/agents/store").Agent | null> {
  try {
    const agents = await listAgents();
    
    const matchingAgents = agents.filter(
      (agent) => agent.category_id === categoryId
    );
    
    if (matchingAgents.length === 0) {
      return null;
    }
    
    // Return the first matching agent
    return matchingAgents[0];
  } catch {
    return null;
  }
}
