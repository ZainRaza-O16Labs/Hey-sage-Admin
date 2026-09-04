import { CategoryForm } from "@/components/ai-management/category-form";

export default function NewCategoryPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <CategoryForm mode="create" />
    </div>
  );
}
