import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSupabaseProjectHost,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

export default function SettingsPage() {
  const configured = isSupabaseConfigured();
  const adminConfigured = isSupabaseAdminConfigured();
  const host = getSupabaseProjectHost();

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>Supabase</CardTitle>
          <CardDescription>
            Connection is read from the root <code>.env</code> file. Restart
            the admin app after changing keys.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Project</p>
              <p className="text-sm text-muted-foreground">
                {host || "NEXT_PUBLIC_SUPABASE_URL is missing"}
              </p>
            </div>
            <Badge variant={configured ? "default" : "secondary"}>
              {configured ? "Connected" : "Not configured"}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Anon / publishable key</p>
              <p className="text-sm text-muted-foreground">
                Used for Auth sign-in
              </p>
            </div>
            <Badge variant={configured ? "default" : "secondary"}>
              {configured ? "Set" : "Missing"}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Service role key</p>
              <p className="text-sm text-muted-foreground">
                Server-only. Needed to list Auth users.
              </p>
            </div>
            <Badge variant={adminConfigured ? "default" : "secondary"}>
              {adminConfigured ? "Set" : "Missing"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
