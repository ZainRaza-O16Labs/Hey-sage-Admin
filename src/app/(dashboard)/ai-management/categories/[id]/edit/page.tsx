import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/ai-management/category-form";
import { AiManagementStoreError, getCategory } from "@/lib/ai-management/store";

type RouteParams = Promise<{ id: string }>;

export default async function EditCategoryPage({ params }: { params: RouteParams }) {
  const { id } = await params;

  let category;
  try {
    category = await getCategory(id);
  } catch (error) {
    if (error instanceof AiManagementStoreError && error.status === 404) {
      notFound();
    }
    notFound();
  }
  if (!category) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <CategoryForm mode="edit" category={category} />
    </div>
  );
}
