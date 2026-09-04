import { redirect } from "next/navigation";
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

const placeholderSessions = [
  {
    id: "—",
    persona: "Sage",
    channel: "Voice",
    started: "—",
    status: "Placeholder",
  },
];

export default function ConversationsPage() {
  redirect("/ai-management/conversations");
  return (
    <div className="mx-auto max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>
            Recent voice and chat sessions will appear here from the server
            session log.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Persona</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {placeholderSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.id}</TableCell>
                  <TableCell>{session.persona}</TableCell>
                  <TableCell>{session.channel}</TableCell>
                  <TableCell>{session.started}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{session.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
