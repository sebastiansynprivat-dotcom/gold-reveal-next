import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

interface StaleRow {
  account_id: string;
  account_email: string | null;
  username: string | null;
  platform: string | null;
  last_update: string | null;
  total: number | null;
}

const HOURS = 3;

const fmtTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    : "–";

/**
 * Warns admins when accounts stopped receiving ingest updates today.
 * A silent ingest gap otherwise shows up as a "wrong" revenue tile for chatters.
 */
export default function StaleIngestAlert() {
  const [rows, setRows] = useState<StaleRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_stale_ingest_accounts", { p_hours: HOURS });
    setLoading(false);
    if (error) {
      console.error("get_stale_ingest_accounts error", error);
      return;
    }
    setRows((data as StaleRow[]) || []);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, StaleRow[]>();
    for (const r of rows) {
      const key = (r.platform || "unbekannt").toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [rows]);

  if (rows.length === 0) return null;

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-left"
      >
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-amber-300">
          Datenlieferung hängt: {rows.length} Account{rows.length === 1 ? "" : "s"} seit über {HOURS}h nicht
          aktualisiert
        </span>
        <div className="flex-1" />
        {grouped.map(([platform, list]) => (
          <Badge key={platform} variant="secondary" className="text-[10px] capitalize">
            {platform} {list.length}
          </Badge>
        ))}
        {open ? (
          <ChevronDown className="h-4 w-4 text-amber-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-amber-400" />
        )}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-border bg-card/50 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Für diese Accounts kamen heute keine neuen Umsätze mehr an. Der Ingest-Bot muss sie nachziehen –
              betroffene Chatter sehen sonst einen zu niedrigen Tagesumsatz.
            </p>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {grouped.map(([platform, list]) => (
            <div key={platform} className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold capitalize">
                {platform} · {list.length}
              </p>
              <div className="divide-y divide-border/60">
                {list.map((r) => (
                  <div key={`${r.account_id}-${platform}`} className="flex items-center gap-2 py-1 text-xs">
                    <span className="text-foreground truncate flex-1">
                      {r.username || r.account_email || r.account_id}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      {Number(r.total ?? 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                    </span>
                    <span className="text-amber-400/80 shrink-0 tabular-nums">{fmtTime(r.last_update)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
