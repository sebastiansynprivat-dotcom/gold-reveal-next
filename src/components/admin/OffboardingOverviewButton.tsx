import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format as formatDate } from "date-fns";
import { de } from "date-fns/locale";
import { LogOut, Loader2, Timer, AlertTriangle } from "lucide-react";

interface Entry {
  id: string;
  model_id: string;
  account_id: string;
  platform: string | null;
  target_date: string;
  status: string;
  modelLabel: string;
  accountLabel: string;
  chatterLabel: string | null;
}

interface Group {
  model_id: string;
  modelLabel: string;
  target_date: string;
  statuses: string[];
  platforms: string[];
  chatters: { platform: string; name: string }[];
}


const STATUS_LABEL: Record<string, string> = {
  scheduled: "geplant",
  running: "läuft",
  failed: "fehlgeschlagen",
};

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-accent/15 text-accent border-accent/30",
  running: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

const countdownText = (targetDate: string, now: number) => {
  const diff = new Date(`${targetDate}T00:00:00`).getTime() - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `noch ${days}d ${hours}h ${minutes}m`;
};

const OffboardingOverviewButton = ({ onSelectModel }: { onSelectModel: (modelId: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [count, setCount] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [open]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: offs } = await (supabase as any)
      .from("account_offboardings")
      .select("id, model_id, account_id, platform, target_date, status")
      .neq("status", "done")
      .order("target_date", { ascending: true });
    const rows = (offs || []) as any[];
    setCount(rows.length);

    const modelIds = [...new Set(rows.map((r) => r.model_id).filter(Boolean))];
    const accountIds = [...new Set(rows.map((r) => r.account_id).filter(Boolean))];

    const [{ data: models }, { data: accounts }] = await Promise.all([
      modelIds.length
        ? (supabase as any).from("models").select("id, username, name").in("id", modelIds)
        : Promise.resolve({ data: [] }),
      accountIds.length
        ? (supabase as any).from("accounts").select("id, platform, username, account_email").in("id", accountIds)
        : Promise.resolve({ data: [] }),
    ]);

    const modelMap = new Map((models || []).map((m: any) => [m.id, m]));
    const accMap = new Map((accounts || []).map((a: any) => [a.id, a]));

    setEntries(
      rows.map((r) => {
        const m: any = modelMap.get(r.model_id);
        const a: any = accMap.get(r.account_id);
        return {
          id: r.id,
          model_id: r.model_id,
          account_id: r.account_id,
          platform: a?.platform || r.platform || null,
          target_date: r.target_date,
          status: r.status,
          modelLabel: m?.username || m?.name || "Unbekanntes Model",
          accountLabel: a?.username || a?.account_email || `${String(r.account_id).slice(0, 8)}…`,
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (count === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-accent/30 text-accent hover:bg-accent/10 shrink-0"
          title="Geplante Offboardings"
        >
          <LogOut className="h-3.5 w-3.5" />
          Offboarding
          <Badge className="ml-0.5 h-4 px-1.5 text-[10px] bg-accent text-accent-foreground">{count}</Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
          <LogOut className="h-3.5 w-3.5 text-accent" />
          <p className="text-xs font-semibold text-foreground">Geplante Offboardings</p>
          {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        <ScrollArea className="max-h-[320px]">
          <div className="p-2 space-y-1.5">
            {entries.map((e) => {
              const cd = countdownText(e.target_date, now);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSelectModel(e.model_id);
                  }}
                  className="w-full text-left rounded-lg border border-border/40 bg-secondary/20 hover:bg-accent/10 hover:border-accent/30 transition-colors p-2 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground truncate">{e.modelLabel}</span>
                    <span
                      className={cn(
                        "text-[9px] px-2 py-0.5 rounded-full border font-medium shrink-0",
                        STATUS_STYLE[e.status] || STATUS_STYLE.scheduled,
                      )}
                    >
                      {STATUS_LABEL[e.status] || e.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {e.platform || "?"} · {e.accountLabel}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {formatDate(new Date(`${e.target_date}T00:00:00`), "dd.MM.yyyy", { locale: de })}
                    </span>
                    {cd ? (
                      <span className="text-[10px] text-muted-foreground font-mono">{cd}</span>
                    ) : (
                      <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Termin erreicht
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default OffboardingOverviewButton;
