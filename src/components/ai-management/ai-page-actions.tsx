import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AIPageActions({ actions }: { actions: Array<{ label: string; href: string; icon?: React.ReactNode }> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.href}
          variant="outline"
          nativeButton={false}
          render={<Link href={action.href} />}
        >
          {action.icon ?? <Plus className="size-4" />}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
