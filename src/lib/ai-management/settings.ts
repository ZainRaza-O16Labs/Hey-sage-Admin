export type AiSettings = {
  default_model: string;
  default_temperature: number;
  default_top_k: number;
  similarity_threshold: number;
  memory_enabled: boolean;
};

export async function fetchSettings(): Promise<AiSettings | null> {
  try {
    const response = await fetch("/api/ai-management/settings");
    if (!response.ok) return null;
    const data = (await response.json()) as { settings: AiSettings };
    return data.settings;
  } catch {
    return null;
  }
}

export async function updateSettings(input: AiSettings): Promise<AiSettings> {
  const response = await fetch("/api/ai-management/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Could not save settings.");
  }
  const data = (await response.json()) as { settings: AiSettings };
  return data.settings;
}
