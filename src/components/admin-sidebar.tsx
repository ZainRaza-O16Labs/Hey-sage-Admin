"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut, Sparkles } from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/login/actions";
import { adminNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "dark flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
      collapsed ? "w-[4.5rem]" : "w-64",
    )}>
      <div className={cn("flex items-center py-5", collapsed ? "justify-center px-2" : "justify-between px-5")}>
        <div className={cn("flex items-center gap-2.5", collapsed && "sr-only")}>
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="size-4" /></span>
          <div>
            <h1 className="text-[17px] font-semibold tracking-[-0.035em]">HeySage</h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">Operations</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
      </div>
      <Separator className="bg-sidebar-border" />
      <nav className={cn("flex flex-1 flex-col gap-1 p-3", collapsed && "items-center px-2")}>
        {adminNav.map((item) => {
          if ("section" in item) {
            return (
              <p
                key={item.href}
                className={cn(
                  "mt-5 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45",
                  collapsed ? "sr-only" : "px-3",
                )}
              >
                {item.label}
              </p>
            );
          }
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              title={collapsed ? item.label : undefined}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg py-2.5 text-[13px] font-medium tracking-[-0.01em] transition-[background-color,color,box-shadow] duration-150",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active
                  ? "bg-primary text-primary-foreground shadow-sm shadow-black/25"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              <span className={cn(collapsed && "sr-only")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className={cn("p-3", collapsed && "px-2")}>
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            className={cn("w-full gap-3", collapsed ? "justify-center px-2" : "justify-start")}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut className="size-4" />
            <span className={cn(collapsed && "sr-only")}>Sign out</span>
          </Button>
        </form>
      </div>
    </aside>
  );
}
