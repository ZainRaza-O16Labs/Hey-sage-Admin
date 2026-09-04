"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
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
      <div className={cn("flex items-start py-5", collapsed ? "justify-center px-2" : "justify-between px-5")}>
        <div className={cn(collapsed && "sr-only")}>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-sidebar-foreground/60">
          Hey Sage
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight">Admin</h1>
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
                  "mt-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45",
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
                "flex items-center rounded-md py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
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
