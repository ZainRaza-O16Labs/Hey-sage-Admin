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
  if (pathname.startsWith("/ai-management/categories")) return "Categories";
  if (pathname.startsWith("/ai-management/agents")) return "Agents";
  if (pathname.startsWith("/ai-management/tools")) return "Tools";
  if (pathname.startsWith("/ai-management/knowledge-bases")) return "Knowledge Bases";
  if (pathname.startsWith("/ai-management/conversations")) return "Conversations";
  if (pathname.startsWith("/ai-management/playground")) return "Playground";
  if (pathname.startsWith("/ai-management/settings")) return "AI Settings";
  if (pathname === "/agents/new") return "Create Agent";
  if (pathname.startsWith("/agents/")) return "Edit Agent";
  if (pathname === "/agents") return "Agents";
  if (pathname === "/conversations") return "Conversations";
  return "Dashboard";
}

function agentBackHref(pathname: string): string | null {
  if (pathname === "/agents/new") return "/agents";
  if (/^\/agents\/[^/]+$/.test(pathname)) return "/agents";
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
