import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

export type AiCategory = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  instructions: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type ParentAgentConfig = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  instructions: string;
  automatic_selection: boolean;
  fallback_agent_id: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export const DEFAULT_ORGANIZATION_ID =
  "a0000000-0000-4000-8000-000000000001";

export class AiManagementStoreError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
    this.name = "AiManagementStoreError";
  }
}

function requireStore() {
  if (!isSupabaseAdminConfigured()) {
    throw new AiManagementStoreError(
      "Supabase service role is not configured.",
      503,
    );
  }
  return createAdminClient();
}

function isMissingRelation(message: string) {
  return /could not find the table|relation .* does not exist|schema cache/i.test(
    message,
  );
}

function storeError(error: { message: string }) {
  if (isMissingRelation(error.message)) {
    return new AiManagementStoreError(
      "AI Management schema is not installed. Apply the Supabase migrations in order.",
      503,
    );
  }
  return new AiManagementStoreError(error.message);
}

export async function listCategories(): Promise<AiCategory[]> {
  const { data, error } = await requireStore()
    .from("ai_categories")
    .select("*")
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .order("name");
  if (error) throw storeError(error);
  return (data ?? []) as AiCategory[];
}

export async function createCategory(input: {
  name: string;
  description: string;
  instructions: string;
  status: "active" | "inactive";
}): Promise<AiCategory> {
  const { data, error } = await requireStore()
    .from("ai_categories")
    .insert({ organization_id: DEFAULT_ORGANIZATION_ID, ...input })
    .select("*")
    .single();
  if (error || !data) throw storeError(error ?? { message: "Could not create category." });
  return data as AiCategory;
}

export async function getParentAgentConfig(): Promise<ParentAgentConfig | null> {
  const { data, error } = await requireStore()
    .from("ai_parent_agent_config")
    .select("*")
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .maybeSingle();
  if (error) throw storeError(error);
  return (data as ParentAgentConfig | null) ?? null;
}

export async function updateParentAgentConfig(input: {
  name: string;
  description: string;
  instructions: string;
  automatic_selection: boolean;
  fallback_agent_id: string | null;
  status: "active" | "inactive";
}): Promise<ParentAgentConfig> {
  const { data, error } = await requireStore()
    .from("ai_parent_agent_config")
    .upsert(
      { organization_id: DEFAULT_ORGANIZATION_ID, ...input },
      { onConflict: "organization_id" },
    )
    .select("*")
    .single();
  if (error || !data) throw storeError(error ?? { message: "Could not save parent agent." });
  return data as ParentAgentConfig;
}

export async function getCategory(id: string): Promise<AiCategory> {
  const { data, error } = await requireStore()
    .from("ai_categories")
    .select("*")
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .maybeSingle();
  if (error) throw storeError(error);
  if (!data) throw new AiManagementStoreError("Category not found.", 404);
  return data as AiCategory;
}

export async function updateCategory(
  id: string,
  input: {
    name: string;
    description: string;
    instructions: string;
    status: "active" | "inactive";
  }
): Promise<AiCategory> {
  const { data, error } = await requireStore()
    .from("ai_categories")
    .update(input)
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .select("*")
    .single();
  if (error || !data) throw storeError(error ?? { message: "Could not update category." });
  return data as AiCategory;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await requireStore()
    .from("ai_categories")
    .delete()
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID);
  if (error) throw storeError(error);
}
