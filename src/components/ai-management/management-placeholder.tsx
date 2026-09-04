import Link from "next/link";
import { ArrowRight, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ManagementPlaceholderProps = {
  title: string;
  description: string;
  nextHref?: string;
  nextLabel?: string;
};

export function ManagementPlaceholder({ title, description, nextHref, nextLabel }: ManagementPlaceholderProps) {
  return <div className="mx-auto max-w-6xl">
    <Card>
      <CardHeader><div className="flex size-10 items-center justify-center rounded-lg bg-muted"><CircleAlert className="size-5 text-muted-foreground" /></div><CardTitle className="mt-2">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent className="space-y-4"><p className="max-w-xl text-sm text-muted-foreground">This route is registered in the AI Management navigation. The current repository does not yet expose the supporting configuration tables or service endpoints, so no demo data or executable backend behavior is being invented here.</p>{nextHref && nextLabel ? <Button nativeButton={false} render={<Link href={nextHref} />}>{nextLabel}<ArrowRight className="size-4" /></Button> : null}</CardContent>
    </Card>
  </div>;
}
