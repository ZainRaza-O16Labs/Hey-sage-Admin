export type AiConversation = {
  id: string;
  agent_id: string;
  agent_name?: string;
  category_name?: string;
  message_count: number;
  created_at: string;
  updated_at: string;
};

export async function fetchConversations(): Promise<AiConversation[]> {
  try {
    const response = await fetch("/api/ai-management/conversations");
    if (!response.ok) return [];
    const data = (await response.json()) as { conversations: AiConversation[] };
    return data.conversations ?? [];
  } catch {
    return [];
  }
}

export async function fetchConversation(id: string): Promise<AiConversation | null> {
  try {
    const response = await fetch(`/api/ai-management/conversations/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) return null;
    const data = (await response.json()) as { conversation: AiConversation };
    return data.conversation;
  } catch {
    return null;
  }
}
