import {
  Bot,
  Braces,
  Database,
  LayoutDashboard,
  MessageSquareText,
  Network,
  Settings2,
  Sparkles,
} from "lucide-react";

export const adminNav = [
  { href: "/ai-management/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ai-management/parent-agent", label: "Parent Agent", icon: Network },
  { href: "/ai-management/categories", label: "Categories", icon: Braces },
  { href: "/ai-management/agents", label: "Agents", icon: Bot },
  { href: "/ai-management/tools", label: "Tools", icon: Braces },
  { href: "/ai-management/knowledge-bases", label: "Knowledge Bases", icon: Database },
  { href: "/ai-management/conversations", label: "Conversations", icon: MessageSquareText },
  { href: "/ai-management/playground", label: "Playground", icon: Sparkles },
  { href: "/ai-management/settings", label: "Settings", icon: Settings2 },
] as const;
