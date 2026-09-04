import Link from "next/link";
import { notFound } from "next/navigation";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type RouteParams = Promise<{ id: string }>;

export default async function EditKnowledgeBasePage({ params }: { params: RouteParams }) {
  const { id } = await params;

  let kb = null;
  try {
    const response = await fetch(`${process.env.SERVER_URL || "http://localhost:3002"}/api/ai-management/knowledge-bases/${id}`);
    if (response.ok) {
      const data = (await response.json()) as { knowledgeBase: { id: string; name: string; description: string; status: string } };
      kb = data.knowledgeBase;
    }
  } catch {
    // not available
  }

  if (!kb) notFound();

  const cancelHref = "/ai-management/knowledge-bases/" + id;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <AiPageHeader
        title="Edit Knowledge Base"
        description={"Update configuration for " + kb.name + "."}
      />
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base Details</CardTitle>
          <CardDescription>Edit the knowledge base configuration.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue={kb.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" defaultValue={kb.description} rows={4} />
            </div>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="status">Status</Label>
              <NativeSelect id="status" defaultValue={kb.status}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </NativeSelect>
            </div>
            <div className="flex gap-2">
              <Button disabled>Save Changes</Button>
              <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} />}>
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Saving knowledge base edits requires backend API support that is not yet available.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
