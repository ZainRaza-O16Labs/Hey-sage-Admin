"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AgentStatusSelect } from "@/components/agents/agent-status-select";
import { DeleteAgentButton } from "@/components/agents/delete-agent-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Agent } from "@/lib/agents/schema";

export function AgentsTable({ agents }: { agents: Agent[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filteredAgents = useMemo(() => agents.filter((agent) => {
    const matchesQuery = `${agent.name} ${agent.description}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "all" || agent.status === status);
  }), [agents, query, status]);

  return (
    <>
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents" aria-label="Search agents" className="pl-8" />
        </div>
        <NativeSelect value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter agents by status" className="sm:w-36">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </NativeSelect>
      </div>
      {filteredAgents.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium">No agents found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search or status filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead className="min-w-56">Agent</TableHead><TableHead className="w-28">Status</TableHead><TableHead className="w-[1%] text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredAgents.map((agent) => <TableRow key={agent.id}>
                <TableCell className="min-w-0 max-w-xl whitespace-normal"><div className="flex min-w-0 flex-col gap-0.5"><Link href={`/agents/${agent.id}`} className="w-fit font-medium text-foreground hover:underline">{agent.name}</Link><p className="line-clamp-2 text-sm text-muted-foreground" title={agent.description || undefined}>{agent.description || "No description"}</p></div></TableCell>
                <TableCell><div className="flex items-center gap-2"><AgentStatusSelect id={agent.id} status={agent.status} /><Badge variant={agent.status === "active" ? "default" : "secondary"}>{agent.status}</Badge></div></TableCell>
                <TableCell className="text-right"><div className="flex items-center justify-end gap-1.5"><Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/agents/${agent.id}`} />}>View</Button><Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/agents/${agent.id}`} />}>Edit</Button><DeleteAgentButton id={agent.id} name={agent.name} stayOnPage size="sm" /></div></TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
