import { redirect } from "next/navigation";

export default function LegacyAgentsPage() {
  redirect("/ai-management/agents");
}
