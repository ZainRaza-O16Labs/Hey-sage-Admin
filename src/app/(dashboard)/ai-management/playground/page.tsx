import { ManagementPlaceholder } from "@/components/ai-management/management-placeholder";

export default function PlaygroundPage() {
  return <ManagementPlaceholder title="Playground" description="Test an agent with execution details once the backend chat and tracing APIs are available." nextHref="/agents" nextLabel="Choose an agent" />;
}
