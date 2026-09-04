import { AiCategory } from "@/lib/ai-management/store";

export type { AiCategory };

export async function fetchCategories(): Promise<AiCategory[]> {
  const response = await fetch("/api/ai-management/categories");
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Could not load categories.");
  }
  const data = (await response.json()) as { categories: AiCategory[] };
  return data.categories;
}

export async function fetchCategory(id: string): Promise<AiCategory | null> {
  const response = await fetch(`/api/ai-management/categories/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Could not load category.");
  }
  const data = (await response.json()) as { category: AiCategory };
  return data.category;
}

export async function createCategoryApi(input: {
  name: string;
  description: string;
  instructions: string;
  status: "active" | "inactive";
}): Promise<AiCategory> {
  const response = await fetch("/api/ai-management/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Could not create category.");
  }
  const data = (await response.json()) as { category: AiCategory };
  return data.category;
}

export async function updateCategory(id: string, input: {
  name: string;
  description: string;
  instructions: string;
  status: "active" | "inactive";
}): Promise<AiCategory> {
  const response = await fetch(`/api/ai-management/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Could not update category.");
  }
  const data = (await response.json()) as { category: AiCategory };
  return data.category;
}

export async function deleteCategory(id: string): Promise<void> {
  const response = await fetch(`/api/ai-management/categories/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Could not delete category.");
  }
}
