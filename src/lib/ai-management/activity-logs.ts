/**
 * Canonical ai_activity_logs writer for Admin Panel mutations.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActivityAction =
  | "create"
  | "update"
  | "delete"
  | "assign"
  | "unassign"
  | "status_change"
  | "upload"
  | "reindex"
  | "configure";

async function resolveActorUserId(
  explicit?: string | null,
): Promise<string | null> {
  if (explicit && explicit.trim()) return explicit.trim();
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function writeActivityLog(input: {
  userId?: string | null;
  action: ActivityAction | string;
  entityType: string;
  entityId: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const userId = await resolveActorUserId(input.userId);
    const supabase = createAdminClient();
    const { error } = await supabase.from("ai_activity_logs").insert({
      user_id: userId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      old_data: input.oldData ?? null,
      new_data: input.newData ?? null,
    });
    if (error) {
      console.warn("[activity-log] persist failed", error.message);
    }
  } catch (error) {
    console.warn("[activity-log] persist failed", error);
  }
}
