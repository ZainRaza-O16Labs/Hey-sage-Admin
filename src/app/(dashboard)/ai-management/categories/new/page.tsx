import { CategoryForm } from "@/components/ai-management/category-form";

export default function NewCategoryPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <CategoryForm mode="create" />
    </div>
  );
}
