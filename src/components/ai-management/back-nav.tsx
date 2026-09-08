import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackNav({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`Back to ${label}`}
      className={cn(
        "group inline-flex w-fit items-center gap-1.5 rounded-md py-1 pr-2 pl-1 text-sm font-medium text-muted-foreground transition-colors",
        "hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </Link>
  );
}
