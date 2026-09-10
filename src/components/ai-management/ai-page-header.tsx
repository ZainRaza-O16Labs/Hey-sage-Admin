import type { ReactNode } from "react";

export function AiPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-semibold tracking-[0.02em] text-primary">{eyebrow}</p> : null}
        <h1 className={eyebrow ? "mt-1.5 text-3xl font-semibold tracking-[-0.035em]" : "text-3xl font-semibold tracking-[-0.035em]"}>{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
