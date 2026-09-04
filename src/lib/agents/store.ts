import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import {
  mapAgentRow,
  type Agent,
  type AgentInput,
  type AgentPatch,
  type AgentStatus,
  type DocumentStatus,
  type InstructionsStatus,
} from "@/lib/agents/schema";

export type AgentStatRow = {
  id: string;
  name: string;
  status: AgentStatus;
  hasInstruction: boolean;
  documentCount: number;
  readyDocuments: number;
  chunkCount: number;
  updatedAt: string;
};

export type AgentDashboardStats = {
  total: number;
  active: number;
  inactive: number;
  documents: {
    total: number;
    ready: number;
    processing: number;
    pending: number;
    error: number;
    totalChunks: number;
  };
  agents: AgentStatRow[];
};

export class AgentsStoreError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message);
  }
}

export function requireStore() {
  if (!isSupabaseAdminConfigured()) {
    throw new AgentsStoreError(
      "Supabase service role is not configured.",
      503,
    );
  }
  return createAdminClient();
}

function isMissingRelation(message: string) {
  return /could not find the table/i.test(message) || /schema cache/i.test(message);
}

export async function listAgents(): Promise<Agent[]> {
  const supabase = requireStore();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingRelation(error.message)) {
      throw new AgentsStoreError(
        "The agents table is missing. Run the latest supabase/migrations SQL in the Supabase SQL editor.",
        503,
      );
    }
    throw new AgentsStoreError(error.message);
  }

  return (data ?? []).map((row) => mapAgentRow(row as Record<string, unknown>));
}

export async function getAgent(id: string): Promise<Agent | null> {
  const supabase = requireStore();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error.message)) {
      throw new AgentsStoreError(
        "The agents table is missing. Run the latest supabase/migrations SQL in the Supabase SQL editor.",
        503,
      );
    }
    throw new AgentsStoreError(error.message);
  }

  return data ? mapAgentRow(data as Record<string, unknown>) : null;
}

export async function createAgent(input: AgentInput): Promise<Agent> {
  const supabase = requireStore();
  const { data, error } = await supabase
    .from("agents")
    .insert({
      organization_id: "a0000000-0000-4000-8000-000000000001",
      name: input.name,
      description: input.description,
      instructions: input.instructions,
      status: input.status,
      voice_id: input.voice_id ?? null,
      voice_name: input.voice_name ?? null,
      configuration: input.configuration ?? {},
      instructions_status: "ready",
      instructions_error: null,
      instructions_generated_at: null,
      instructions_version: 0,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new AgentsStoreError(error?.message ?? "Could not create agent.");
  }

  return mapAgentRow(data as Record<string, unknown>);
}

export async function updateAgent(id: string, patch: AgentPatch): Promise<Agent> {
  const supabase = requireStore();
  const payload: Record<string, unknown> = { ...patch };
  if ("instructions" in patch) {
    payload.instructions_status = "ready";
    payload.instructions_error = null;
  }
  if ("voice_id" in patch) {
    payload.voice_id = patch.voice_id ?? null;
  }
  if ("voice_name" in patch) {
    payload.voice_name = patch.voice_name ?? null;
  }
  if ("configuration" in patch) {
    payload.configuration = patch.configuration ?? {};
  }
  const { data, error } = await supabase
    .from("agents")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "PGRST116") {
      throw new AgentsStoreError("Agent not found.", 404);
    }
    throw new AgentsStoreError(error?.message ?? "Could not update agent.");
  }

  return mapAgentRow(data as Record<string, unknown>);
}

export async function deleteAgent(id: string): Promise<void> {
  const supabase = requireStore();

  const { error: conversationsError } = await supabase
    .from("conversations")
    .delete()
    .eq("agent_id", id);
  if (conversationsError && !isMissingRelation(conversationsError.message)) {
    throw new AgentsStoreError(conversationsError.message);
  }

  const { data: docs } = await supabase
    .from("knowledge_documents")
    .select("storage_path")
    .eq("agent_id", id);

  const paths = (docs ?? [])
    .map((row) => row.storage_path)
    .filter((path): path is string => Boolean(path));
  if (paths.length > 0) {
    await supabase.storage.from("agent-documents").remove(paths);
  }

  const { data, error } = await supabase
    .from("agents")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new AgentsStoreError(error.message);
  }
  if (!data) {
    throw new AgentsStoreError("Agent not found.", 404);
  }
}

export async function countAgents(): Promise<number> {
  const supabase = requireStore();
  const { count, error } = await supabase
    .from("agents")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new AgentsStoreError(error.message);
  }
  return count ?? 0;
}

type DocumentStatRow = {
  agent_id: string;
  status: DocumentStatus;
  chunk_count: number | null;
};

function emptyDocumentTotals() {
  return {
    total: 0,
    ready: 0,
    processing: 0,
    pending: 0,
    error: 0,
    totalChunks: 0,
  };
}

export async function getAgentDashboardStats(): Promise<AgentDashboardStats> {
  const agents = await listAgents();

  const supabase = requireStore();
  const { data, error } = await supabase
    .from("knowledge_documents")
    .select("agent_id, status, chunk_count");

  if (error) {
    if (isMissingRelation(error.message)) {
      return {
        total: agents.length,
        active: agents.filter((agent) => agent.status === "active").length,
        inactive: agents.filter((agent) => agent.status === "inactive").length,
        documents: emptyDocumentTotals(),
        agents: agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          status: agent.status,
          hasInstruction: agent.instructions.trim().length > 0,
          documentCount: 0,
          readyDocuments: 0,
          chunkCount: 0,
          updatedAt: agent.updated_at,
        })),
      };
    }
    throw new AgentsStoreError(error.message);
  }

  const byAgent = new Map<
    string,
    { documentCount: number; readyDocuments: number; chunkCount: number }
  >();
  const documents = emptyDocumentTotals();

  for (const row of (data ?? []) as DocumentStatRow[]) {
    documents.total += 1;
    documents.totalChunks += row.chunk_count ?? 0;

    if (row.status === "ready") documents.ready += 1;
    else if (row.status === "processing") documents.processing += 1;
    else if (row.status === "pending") documents.pending += 1;
    else if (row.status === "error") documents.error += 1;

    const current = byAgent.get(row.agent_id) ?? {
      documentCount: 0,
      readyDocuments: 0,
      chunkCount: 0,
    };
    current.documentCount += 1;
    if (row.status === "ready") current.readyDocuments += 1;
    current.chunkCount += row.chunk_count ?? 0;
    byAgent.set(row.agent_id, current);
  }

  return {
    total: agents.length,
    active: agents.filter((agent) => agent.status === "active").length,
    inactive: agents.filter((agent) => agent.status === "inactive").length,
    documents,
    agents: agents.map((agent) => {
      const docStats = byAgent.get(agent.id) ?? {
        documentCount: 0,
        readyDocuments: 0,
        chunkCount: 0,
      };
      return {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        hasInstruction: agent.instructions.trim().length > 0,
        documentCount: docStats.documentCount,
        readyDocuments: docStats.readyDocuments,
        chunkCount: docStats.chunkCount,
        updatedAt: agent.updated_at,
      };
    }),
  };
}
