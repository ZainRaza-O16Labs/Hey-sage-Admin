import { requireStore, AgentsStoreError, getAgent, updateAgent } from "@/lib/agents/store";
import {
  mapAgentVoiceRow,
  type AgentVoice,
  type AgentVoiceInput,
} from "@/lib/agents/schema";

function isMissingRelation(message: string) {
  return /could not find the table/i.test(message) || /schema cache/i.test(message);
}

function storeError(error: { message?: string } | null, fallback: string) {
  throw new AgentsStoreError(error?.message ?? fallback);
}

export async function listAgentVoices(agentId: string): Promise<AgentVoice[]> {
  const supabase = requireStore();
  const { data, error } = await supabase
    .from("agent_voices")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingRelation(error.message)) {
      // Pre-migration fallback: synthesize from legacy columns.
      const agent = await getAgent(agentId);
      if (!agent?.voice_id) return [];
      return [
        {
          id: `legacy-${agent.id}`,
          agent_id: agent.id,
          voice_id: agent.voice_id,
          voice_name: agent.voice_name,
          verified: true,
          is_default: true,
          created_at: agent.created_at,
          updated_at: agent.updated_at,
        },
      ];
    }
    throw new AgentsStoreError(error.message);
  }

  return (data ?? []).map((row) => mapAgentVoiceRow(row as Record<string, unknown>));
}

export async function getDefaultAgentVoice(
  agentId: string,
): Promise<AgentVoice | null> {
  const voices = await listAgentVoices(agentId);
  return (
    voices.find((voice) => voice.is_default && voice.verified) ??
    voices.find((voice) => voice.verified) ??
    null
  );
}

/**
 * Replace an agent's voice catalog atomically (from the Admin form).
 * - Empty voice_id rows are ignored by the caller.
 * - Every saved row must be verified.
 * - Exactly one default among the saved set.
 * - Mirrors the default into agents.voice_id / voice_name for legacy readers.
 */
export async function replaceAgentVoices(
  agentId: string,
  voices: AgentVoiceInput[],
): Promise<AgentVoice[]> {
  const agent = await getAgent(agentId);
  if (!agent) {
    throw new AgentsStoreError("Agent not found.", 404);
  }

  const normalized = normalizeVoiceInputs(voices);
  const supabase = requireStore();

  const { error: deleteError } = await supabase
    .from("agent_voices")
    .delete()
    .eq("agent_id", agentId);

  if (deleteError) {
    if (isMissingRelation(deleteError.message)) {
      const defaultVoice = normalized.find((v) => v.is_default) ?? normalized[0] ?? null;
      await updateAgent(agentId, {
        voice_id: defaultVoice?.voice_id ?? null,
        voice_name: defaultVoice?.voice_name ?? null,
      });
      return defaultVoice
        ? [
            {
              id: `legacy-${agentId}`,
              agent_id: agentId,
              voice_id: defaultVoice.voice_id,
              voice_name: defaultVoice.voice_name ?? null,
              verified: true,
              is_default: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]
        : [];
    }
    storeError(deleteError, "Could not clear agent voices.");
  }

  if (normalized.length === 0) {
    await updateAgent(agentId, { voice_id: null, voice_name: null });
    return [];
  }

  const { data, error } = await supabase
    .from("agent_voices")
    .insert(
      normalized.map((voice) => ({
        agent_id: agentId,
        voice_id: voice.voice_id,
        voice_name: voice.voice_name,
        verified: true,
        is_default: voice.is_default,
      })),
    )
    .select("*");

  if (error || !data) {
    storeError(error, "Could not save agent voices.");
  }

  const defaultVoice =
    normalized.find((voice) => voice.is_default) ?? normalized[0]!;
  await updateAgent(agentId, {
    voice_id: defaultVoice.voice_id,
    voice_name: defaultVoice.voice_name,
  });

  return (data ?? [])
    .map((row) => mapAgentVoiceRow(row as Record<string, unknown>))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function deleteAgentVoice(
  agentId: string,
  voiceRowId: string,
): Promise<AgentVoice[]> {
  const supabase = requireStore();
  const existing = await listAgentVoices(agentId);
  const target = existing.find((voice) => voice.id === voiceRowId);
  if (!target) {
    throw new AgentsStoreError("Voice not found.", 404);
  }

  const { error } = await supabase
    .from("agent_voices")
    .delete()
    .eq("id", voiceRowId)
    .eq("agent_id", agentId);

  if (error) {
    storeError(error, "Could not delete voice.");
  }

  const remaining = existing.filter((voice) => voice.id !== voiceRowId);
  if (target.is_default && remaining.length > 0) {
    const nextDefault = remaining.find((voice) => voice.verified) ?? remaining[0]!;
    await setDefaultAgentVoice(agentId, nextDefault.id);
    return listAgentVoices(agentId);
  }

  if (remaining.length === 0) {
    await updateAgent(agentId, { voice_id: null, voice_name: null });
  }

  return listAgentVoices(agentId);
}

export async function setDefaultAgentVoice(
  agentId: string,
  voiceRowId: string,
): Promise<AgentVoice[]> {
  const voices = await listAgentVoices(agentId);
  const target = voices.find((voice) => voice.id === voiceRowId);
  if (!target) {
    throw new AgentsStoreError("Voice not found.", 404);
  }
  if (!target.verified) {
    throw new AgentsStoreError("Only a verified voice can be the default.", 400);
  }

  const supabase = requireStore();

  // Clear then set — unique partial index allows only one default.
  const { error: clearError } = await supabase
    .from("agent_voices")
    .update({ is_default: false })
    .eq("agent_id", agentId)
    .eq("is_default", true);
  if (clearError && !isMissingRelation(clearError.message)) {
    storeError(clearError, "Could not clear default voice.");
  }

  const { error: setError } = await supabase
    .from("agent_voices")
    .update({ is_default: true })
    .eq("id", voiceRowId)
    .eq("agent_id", agentId);
  if (setError) {
    storeError(setError, "Could not set default voice.");
  }

  await updateAgent(agentId, {
    voice_id: target.voice_id,
    voice_name: target.voice_name,
  });

  return listAgentVoices(agentId);
}

function normalizeVoiceInputs(voices: AgentVoiceInput[]): AgentVoiceInput[] {
  const seen = new Set<string>();
  const cleaned: AgentVoiceInput[] = [];

  for (const voice of voices) {
    const voiceId = voice.voice_id.trim();
    if (!voiceId) continue;
    if (!voice.verified) {
      throw new AgentsStoreError(
        "Every voice must be verified before saving.",
        400,
      );
    }
    const key = voiceId.toLowerCase();
    if (seen.has(key)) {
      throw new AgentsStoreError(
        `Duplicate Voice ID "${voiceId}" is not allowed on the same agent.`,
        400,
      );
    }
    seen.add(key);
    cleaned.push({
      voice_id: voiceId,
      voice_name: voice.voice_name?.trim() || null,
      verified: true,
      is_default: Boolean(voice.is_default),
    });
  }

  if (cleaned.length === 0) {
    throw new AgentsStoreError("At least one verified voice is required.", 400);
  }

  const defaultCount = cleaned.filter((voice) => voice.is_default).length;
  if (defaultCount === 0) {
    cleaned[0]!.is_default = true;
  } else if (defaultCount > 1) {
    let kept = false;
    for (const voice of cleaned) {
      if (voice.is_default && !kept) {
        kept = true;
      } else {
        voice.is_default = false;
      }
    }
  }

  return cleaned;
}
