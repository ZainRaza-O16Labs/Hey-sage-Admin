export type AiTool = {
  id: string;
  organization_id: string;
  name: string;
  key: string;
  description: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export async function fetchTools(): Promise<AiTool[]> {
  try {
    const response = await fetch("/api/ai-management/tools");
    if (!response.ok) return [];
    const data = (await response.json()) as { tools: AiTool[] };
    return data.tools ?? [];
  } catch {
    return [];
  }
}

export async function fetchTool(id: string): Promise<AiTool | null> {
  try {
    const response = await fetch(`/api/ai-management/tools/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) return null;
    const data = (await response.json()) as { tool: AiTool };
    return data.tool;
  } catch {
    return null;
  }
}

export async function fetchToolsByAgent(agentId: string): Promise<AiTool[]> {
  try {
    const response = await fetch(`/api/ai-management/tools?agentId=${agentId}`);
    if (!response.ok) return [];
    const data = (await response.json()) as { tools: AiTool[] };
    return data.tools ?? [];
  } catch {
    return [];
  }
}
