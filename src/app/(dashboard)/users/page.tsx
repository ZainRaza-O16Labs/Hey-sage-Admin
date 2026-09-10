import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

function formatDate(value: string | undefined) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString();
}

export default async function UsersPage() {
  if (!isSupabaseAdminConfigured()) {
    return (
      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Listing Auth users needs the server-only{" "}
              <code>SUPABASE_SERVICE_ROLE_KEY</code> in the root{" "}
              <code>.env</code> file.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  let errorMessage: string | null = null;
  let users: Array<{
    id: string;
    email: string;
    createdAt: string;
    lastSignIn: string;
    confirmed: boolean;
  }> = [];

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 50,
    });
    if (error) {
      errorMessage = error.message;
    } else {
      users = data.users.map((user) => ({
        id: user.id,
        email: user.email ?? "—",
        createdAt: formatDate(user.created_at),
        lastSignIn: formatDate(user.last_sign_in_at),
        confirmed: Boolean(user.email_confirmed_at),
      }));
    }
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Could not load users.";
  }

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Supabase Auth users in this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last sign in</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No users yet. Create one in the Supabase Auth dashboard.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.createdAt}</TableCell>
                      <TableCell>{user.lastSignIn}</TableCell>
                      <TableCell>
                        <Badge variant={user.confirmed ? "default" : "secondary"}>
                          {user.confirmed ? "Confirmed" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
