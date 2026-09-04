import { ManagementPlaceholder } from "@/components/ai-management/management-placeholder";

export default function SettingsPage() {
  return <ManagementPlaceholder title="AI Settings" description="Global model, retrieval, memory, and execution settings will appear here when they are backed by runtime configuration." nextHref="/ai-management/dashboard" nextLabel="Back to dashboard" />;
}
