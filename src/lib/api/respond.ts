import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/session";
import { AgentsStoreError } from "@/lib/agents/store";
import type { FieldErrors } from "@/lib/agents/schema";

export async function requireApiUser() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return {
        user: null,
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    return { user, error: null };
  } catch {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}

export function jsonError(message: string, status = 400, errors?: FieldErrors) {
  return NextResponse.json(
    errors ? { error: message, errors } : { error: message },
    { status },
  );
}

export function storeErrorResponse(error: unknown) {
  if (error instanceof AgentsStoreError) {
    return jsonError(error.message, error.status);
  }
  const message = error instanceof Error ? error.message : "Unexpected error.";
  return jsonError(message, 500);
}
