import { NextResponse } from "next/server";
import { createAgent, listAgents } from "@/lib/agents/store";
import { getAgentDocumentCounts } from "@/lib/agents/documents";
import { validateAgentInput } from "@/lib/agents/schema";
import {
  jsonError,
  requireApiUser,
  storeErrorResponse,
} from "@/lib/api/respond";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const agents = await listAgents();
    const documentCounts: Record<string, number> = await getAgentDocumentCounts().catch(
      () => ({} as Record<string, number>),
    );
    return NextResponse.json({
      agents: agents.map((agent) => ({
        ...agent,
        documentCount: documentCounts[agent.id] ?? 0,
      })),
    });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const parsed = validateAgentInput(body);
  if (!parsed.ok) {
    return jsonError("Please fix the highlighted fields.", 422, parsed.errors);
  }

  try {
    const agent = await createAgent(parsed.data);
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    return storeErrorResponse(error);
  }
}
