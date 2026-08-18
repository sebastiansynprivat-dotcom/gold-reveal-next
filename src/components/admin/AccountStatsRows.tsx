import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  accountId: string;
  userId: string;
  onAssignedDate?: (date: string | null) => void;
}

interface Stats {
  today: number;
  yesterday: number;
  week: number;
  month: number;
  allTime: number;
  massDMs: number | null;
  openChats: number | null;
  oldestChat: number | null;
  assignedSince: string | null;
}

const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
};

export default function AccountStatsRows({ accountId, userId, onAssignedDate }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // All aggregation happens server-side (scoped to this chatter's assignment windows)
      const { data, error } = await supabase.rpc("get_account_chatter_stats", {
        p_account_id: accountId,
        p_user_id: userId,
      });

      if (cancelled) return;

      const r: any = Array.isArray(data) ? data[0] : data;

      if (error || !r) {
        onAssignedDate?.(null);
        setStats({
          today: 0, yesterday: 0, week: 0, month: 0, allTime: 0,
          massDMs: null, openChats: null, oldestChat: null, assignedSince: null,
        });
        setLoading(false);
        return;
      }

      const assignedSince = r.assigned_since ? String(r.assigned_since).slice(0, 10) : null;
      onAssignedDate?.(fmtDate(assignedSince));

      setStats({
        today: Number(r.today || 0),
        yesterday: Number(r.yesterday || 0),
        week: Number(r.week || 0),
        month: Number(r.month || 0),
        allTime: Number(r.all_time || 0),
        massDMs: r.mass_dms === null ? null : Number(r.mass_dms),
        openChats: r.open_chats === null ? null : Number(r.open_chats),
        oldestChat: r.oldest_chat === null ? null : Number(r.oldest_chat),
        assignedSince,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [accountId, userId]);

  if (loading || !stats) {
    return (
      <div className="px-3.5 pb-3 pt-1 space-y-1.5 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 bg-muted/30 rounded" />
        ))}
      </div>
    );
  }

  const since = fmtDate(stats.assignedSince);

  return (
    <div className="px-3.5 pb-3 pt-1 space-y-1.5">
      <p className="text-[10px] text-muted-foreground px-1">
        {since ? `Umsatz (seit Zuweisung ${since})` : "Umsatz (keine Zuweisung gefunden)"}
      </p>
      {[
        { label: "Heute", value: `${fmt(stats.today)}€` },
        { label: "Gestern", value: `${fmt(stats.yesterday)}€` },
        { label: "Woche", value: `${fmt(stats.week)}€` },
        { label: "Monat", value: `${fmt(stats.month)}€` },
        { label: "All-Time", value: `${fmt(stats.allTime)}€` },
      ].map((s) => (
        <div key={s.label} className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
          <span className="text-sm font-bold text-foreground">{s.value}</span>
        </div>
      ))}
      <div className="border-t border-border/50 pt-1.5 mt-1 space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground">Mass-DMs</span>
          <span className="text-sm font-bold text-foreground">{stats.massDMs ?? "–"}</span>
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground">Offene Chats</span>
          <span className="text-sm font-bold text-foreground">{stats.openChats ?? "–"}</span>
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground">Ältester offener Chat</span>
          <span className="text-sm font-bold text-foreground">
            {stats.oldestChat ? `${stats.oldestChat}d` : "–"}
          </span>
        </div>
      </div>
    </div>
  );
}
