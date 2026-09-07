"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { AISkeleton } from "@/components/ai-management/ai-skeleton";
import type { AiKnowledgeBase } from "@/lib/ai-management/knowledge-bases";

type FormValue = {
  name: string;
  description: string;
  status: "active" | "inactive";
};

export function AiKnowledgeBaseEditPage({ knowledgeBaseId }: { knowledgeBaseId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormValue | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValue, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/ai-management/knowledge-bases/${knowledgeBaseId}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data: { knowledgeBase?: AiKnowledgeBase } | null) => {
        if (active && data?.knowledgeBase) {
          setForm({
            name: data.knowledgeBase.name,
            description: data.knowledgeBase.description,
            status: data.knowledgeBase.status,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [knowledgeBaseId]);

  function update<K extends keyof FormValue>(key: K, value: FormValue[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setMessage(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setPending(true);
    setMessage(null);
    setErrors({});
    try {
      const response = await fetch(`/api/ai-management/knowledge-bases/${knowledgeBaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          status: form.status,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        errors?: Partial<Record<keyof FormValue, string>>;
      };
      if (!response.ok) {
        setErrors(payload.errors ?? {});
        setMessage(payload.error ?? "Could not update knowledge base.");
        return;
      }
      router.push(`/ai-management/knowledge-bases/${knowledgeBaseId}`);
      router.refresh();
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (!form) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <AiPageHeader
          title="Edit Knowledge Base"
          description="Update configuration for this knowledge base."
        />
        <AISkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <AiPageHeader
        title="Edit Knowledge Base"
        description={"Update configuration for " + form.name + "."}
      />
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base Details</CardTitle>
          <CardDescription>Edit the knowledge base configuration.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g., Product Documentation"
                aria-invalid={Boolean(errors.name)}
                required
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={4}
              />
            </div>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="status">Status</Label>
              <NativeSelect
                id="status"
                value={form.status}
                onChange={(e) => update("status", e.target.value as FormValue["status"])}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </NativeSelect>
            </div>
            {message && <p className="text-sm text-destructive">{message}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Changes"}</Button>
              <Button
                type="button"
                variant="outline"
                nativeButton={false}
                render={<Link href={`/ai-management/knowledge-bases/${knowledgeBaseId}`} />}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}