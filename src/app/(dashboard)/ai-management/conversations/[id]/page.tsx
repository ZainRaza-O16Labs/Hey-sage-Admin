import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, User, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";

type RouteParams = Promise<{ id: string }>;

export default async function ConversationDetailPage({ params }: { params: RouteParams }) {
  const { id } = await params;

  let conversation = null;
  try {
    const response = await fetch(`${process.env.SERVER_URL || "http://localhost:3002"}/api/ai-management/conversations/${id}`);
    if (response.ok) {
      const data = (await response.json()) as { conversation: { id: string; agent_id: string; agent_name?: string; category_name?: string; message_count: number; created_at: string; updated_at: string } };
      conversation = data.conversation;
    }
  } catch {
    // not available
  }

  if (!conversation) notFound();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AiPageHeader
          title="Conversation Detail"
          description={`Conversation ${conversation.id.slice(0, 8)}... with ${conversation.agent_name ?? "unknown agent"}.`}
          action={
            <Button variant="outline" nativeButton={false} render={<Link href="/ai-management/conversations" />}>
              <ArrowLeft className="size-4" />
              Back to Conversations
            </Button>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversation Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Agent</span>
            <span className="text-sm text-muted-foreground">{conversation.agent_name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Category</span>
            <span className="text-sm text-muted-foreground">{conversation.category_name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Messages</span>
            <Badge variant="secondary">{conversation.message_count}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Created</span>
            <span className="text-sm text-muted-foreground">{new Date(conversation.created_at).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>Full conversation transcript.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Message history not yet available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Full conversation transcripts will be available once the backend conversation API is enabled.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
