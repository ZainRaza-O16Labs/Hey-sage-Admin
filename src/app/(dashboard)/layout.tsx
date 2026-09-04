import { AdminHeader } from "@/components/admin-header";
import { AdminSidebar } from "@/components/admin-sidebar";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email: string | null = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? null;
  }

  return (
    <div className="flex min-h-full">
      <div className="hidden md:block">
        <div className="sticky top-0 h-screen">
          <AdminSidebar />
        </div>
      </div>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminHeader email={email} />
        <main className="flex-1 bg-muted/40 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
