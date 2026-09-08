"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AiPageHeader } from "@/components/ai-management/ai-page-header";
import { BackNav } from "@/components/ai-management/back-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { AiCategory } from "@/lib/ai-management/store";

type CategoryFormInput = {
  name: string;
  description: string;
  instructions: string;
  status: "active" | "inactive";
};

const emptyForm: CategoryFormInput = {
  name: "",
  description: "",
  instructions: "",
  status: "active",
};

type CategoryFormProps = {
  mode: "create" | "edit";
  category?: AiCategory;
};

export function CategoryForm({ mode, category }: CategoryFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<CategoryFormInput>(
    category
      ? { name: category.name, description: category.description, instructions: category.instructions, status: category.status }
      : emptyForm
  );
  const [errors, setErrors] = useState<Partial<Record<keyof CategoryFormInput, string>>>({});
  const [pending, setPending] = useState(false);

  function update<K extends keyof CategoryFormInput>(key: K, value: CategoryFormInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});

    try {
      const response = await fetch(
        mode === "create" ? "/api/ai-management/categories" : `/api/ai-management/categories/${category?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const payload = (await response.json()) as { category?: AiCategory; error?: string; errors?: Partial<Record<keyof CategoryFormInput, string>> };

      if (!response.ok) {
        setErrors(payload.errors ?? {});
        notifyError(payload.error ?? (mode === "create" ? "Failed to create category." : "Failed to update category."));
        return;
      }

      if (mode === "create" && payload.category) {
        notifySuccess("Category created successfully.");
        router.push(`/ai-management/categories/${payload.category.id}`);
        router.refresh();
        return;
      }

      notifySuccess("Category updated successfully.");
      router.refresh();
    } catch {
      notifyError(mode === "create" ? "Failed to create category." : "Failed to update category.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <BackNav href="/ai-management/categories" label="Categories" />
      <AiPageHeader
        title={mode === "create" ? "Create Category" : "Edit Category"}
        description={mode === "create" ? "Add a new category to organize your agents." : `Update the configuration for ${category?.name ?? "this category"}.`}
      />
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "New Category" : "Category Details"}</CardTitle>
          <CardDescription>
            Categories help organize specialized agents into logical groups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g., Customer Support"
                aria-invalid={Boolean(errors.name)}
                required
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Short description of this category"
                aria-invalid={Boolean(errors.description)}
              />
              {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Category Instructions</Label>
              <Textarea
                id="instructions"
                name="instructions"
                value={form.instructions}
                onChange={(e) => update("instructions", e.target.value)}
                placeholder="Instructions for how agents in this category should behave..."
                aria-invalid={Boolean(errors.instructions)}
                rows={12}
                className="min-h-48 font-mono text-xs leading-relaxed"
              />
              <div className="flex items-center justify-between">
                {errors.instructions ? (
                  <p className="text-sm text-destructive">{errors.instructions}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Instructions guide agents in this category. Character count: {form.instructions.length.toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="max-w-xs space-y-2">
              <Label htmlFor="status">Status</Label>
              <NativeSelect
                id="status"
                name="status"
                value={form.status}
                onChange={(e) => update("status", e.target.value as CategoryFormInput["status"])}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </NativeSelect>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : mode === "create" ? "Create Category" : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" nativeButton={false} render={<Link href="/ai-management/categories" />}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
