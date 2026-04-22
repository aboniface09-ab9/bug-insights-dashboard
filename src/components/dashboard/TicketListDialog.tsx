import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { jiraUrl } from "@/lib/jira-config";
import type { BugRow } from "@/lib/bug-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  rows: BugRow[];
}

export function TicketListDialog({ open, onOpenChange, title, subtitle, rows }: Props) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const ids = rows.map((r) => r.ticketId);

  const copyAll = async () => {
    await navigator.clipboard.writeText(ids.join("\n"));
    setCopiedAll(true);
    toast.success(`Copied ${ids.length} ticket IDs`);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  const copyOne = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border/60 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
          <Badge variant="outline" className="font-mono text-xs">
            {ids.length} {ids.length === 1 ? "ticket" : "tickets"}
          </Badge>
          <Button size="sm" variant="outline" onClick={copyAll} disabled={ids.length === 0}>
            {copiedAll ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
            {copiedAll ? "Copied" : "Copy all"}
          </Button>
        </div>

        <ScrollArea className="max-h-[55vh] pr-3">
          {ids.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No tickets in this group.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {rows.map((r) => (
                <li key={r.ticketId} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex min-w-0 flex-col">
                    <a
                      href={jiraUrl(r.ticketId)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-sm text-primary hover:underline"
                    >
                      {r.ticketId}
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </a>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {r.severity} · {r.environment} · {r.component} · {r.reporter}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => copyOne(r.ticketId)}
                  >
                    {copiedId === r.ticketId ? (
                      <Check className="h-3.5 w-3.5 text-[var(--success)]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
