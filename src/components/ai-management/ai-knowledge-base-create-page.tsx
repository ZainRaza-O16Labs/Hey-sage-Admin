"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type FormInput = {
  name: string;
  description: string;
  status: "active" | "inactive";
};

const emptyForm: FormInput = { name: "", description: "", status: "active" };

export function AiKnowledgeBaseCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormInput>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormInput, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update<K extends keyof FormInput>(key: K, value: FormInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setErrors({});

    try {
      const response = await fetch("/api/ai-management/knowledge-bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { knowledgeBase?: { id: string }; error?: string; errors?: Partial<Record<keyof FormInput, string>> };

      if (!response.ok) {
        setErrors(payload.errors ?? {});
        setMessage(payload.error ?? "Could not create knowledge base.");
        return;
      }

      if (payload.knowledgeBase) {
        router.push(`/ai-management/knowledge-bases/${payload.knowledgeBase.id}`);
      }
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <AiPageHeader
        title="Create Knowledge Base"
        description="Add a new knowledge base to organize documents for agent retrieval."
      />
      <Card>
        <CardHeader>
          <CardTitle>New Knowledge Base</CardTitle>
          <CardDescription>Knowledge bases group documents that can be assigned to agents.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g., Product Documentation" aria-invalid={Boolean(errors.name)} required />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="What knowledge does this base contain?" rows={4} />
            </div>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="status">Status</Label>
              <NativeSelect id="status" value={form.status} onChange={(e) => update("status", e.target.value as FormInput["status"])}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </NativeSelect>
            </div>
            {message && <p className="text-sm text-destructive">{message}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create Knowledge Base"}</Button>
              <Button type="button" variant="outline" nativeButton={false} render={<Link href="/ai-management/knowledge-bases" />}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
