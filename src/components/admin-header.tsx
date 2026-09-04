"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import { adminNav } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function pageTitle(pathname: string) {
  if (pathname === "/ai-management" || pathname === "/ai-management/dashboard") return "AI Dashboard";
  if (pathname.startsWith("/ai-management/parent-agent")) return "Parent Agent";
  if (pathname.startsWith("/ai-management/categories/new")) return "Create Category";
  if (pathname.includes("/categories/") && pathname.endsWith("/edit")) return "Edit Category";
  if (pathname.includes("/categories/") && pathname.endsWith("/knowledge")) return "Category Knowledge";
  if (pathname.startsWith("/ai-management/categories")) return "Category Details";
  if (pathname.startsWith("/ai-management/agents/new")) return "Create Agent";
  if (pathname.includes("/agents/") && pathname.endsWith("/edit")) return "Edit Agent";
  if (pathname.includes("/agents/") && pathname.endsWith("/tools")) return "Agent Tools";
  if (pathname.includes("/agents/") && pathname.endsWith("/knowledge")) return "Agent Knowledge";
  if (pathname.includes("/agents/") && pathname.endsWith("/preview")) return "Agent Preview";
  if (pathname.startsWith("/ai-management/agents")) return "Agents";
  if (pathname.startsWith("/ai-management/tools")) return "Tools";
  if (pathname.startsWith("/ai-management/knowledge-bases")) return "Knowledge Bases";
  if (pathname.startsWith("/ai-management/conversations")) return "Conversations";
  if (pathname.startsWith("/ai-management/playground")) return "Playground";
  if (pathname.startsWith("/ai-management/settings")) return "AI Settings";
  return "AI Management";
}

function agentBackHref(pathname: string): string | null {
  if (pathname.startsWith("/ai-management/agents/new")) return "/ai-management/agents";
  if (pathname.startsWith("/ai-management/agents/") && pathname.endsWith("/edit")) return pathname.replace(/\/edit$/, "");
  if (pathname.startsWith("/ai-management/agents/") && pathname.endsWith("/tools")) return pathname.replace(/\/tools$/, "");
  if (pathname.startsWith("/ai-management/agents/") && pathname.endsWith("/knowledge")) return pathname.replace(/\/knowledge$/, "");
  if (pathname.startsWith("/ai-management/agents/") && pathname.endsWith("/preview")) return pathname.replace(/\/preview$/, "");
  if (pathname.startsWith("/ai-management/categories/new")) return "/ai-management/categories";
  if (pathname.startsWith("/ai-management/categories/") && pathname.endsWith("/edit")) return pathname.replace(/\/edit$/, "");
  if (pathname.startsWith("/ai-management/categories/") && pathname.endsWith("/knowledge")) return pathname.replace(/\/knowledge$/, "");
  if (pathname.startsWith("/ai-management/knowledge-bases/new")) return "/ai-management/knowledge-bases";
  if (pathname.startsWith("/ai-management/knowledge-bases/") && pathname.endsWith("/edit")) return pathname.replace(/\/edit$/, "");
  if (pathname.startsWith("/ai-management/tools/")) return "/ai-management/tools";
  if (pathname.startsWith("/ai-management/conversations/") && !pathname.endsWith("/conversations")) return "/ai-management/conversations";
  return null;
}

export function AdminHeader({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const title = pageTitle(pathname);
  const backHref = agentBackHref(pathname);

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4 md:px-6">
      {backHref ? (
        <Button
          nativeButton={false}
          variant="ghost"
          size="icon"
          className="shrink-0"
          render={<Link href={backHref} aria-label="Back to agents" />}
        >
          <ArrowLeft className="size-5" />
        </Button>
      ) : null}
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="md:hidden" />
          }
        >
          <Menu className="size-5" />
          <span className="sr-only">Open navigation</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="px-5 py-5 text-left">
            <SheetTitle>Hey Sage Admin</SheetTitle>
          </SheetHeader>
          <Separator />
          <nav className="flex flex-col gap-1 p-3">
            {adminNav.map((item) => {
              if ("section" in item) {
                return <p key={item.href} className="mt-5 px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>;
              }
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${active ? "bg-accent text-accent-foreground" : "hover:bg-accent"}`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">Internal operations</p>
      </div>
      {email ? (
        <p className="ml-auto truncate text-xs text-muted-foreground">{email}</p>
      ) : null}
    </header>
  );
}
