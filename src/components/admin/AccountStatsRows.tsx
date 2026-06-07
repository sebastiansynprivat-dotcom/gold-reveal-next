import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  accountId: string;
}

interface Stats {
  yesterday: number;
  week: number;
  month: number;
  allTime: number;
  massDMs: number | null;
  openChats: number | null;
  oldestChat: number | null;
}

const fmt = (n: number) => n.toLocaleString("de-DE");

export default function AccountStatsRows({ accountId }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const today = new Date();
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
      const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const { data, error } = await supabase
        .from("accounts_data")
        .select("date,total,mass_dms,unread_chats,oldest_chat")
        .eq("account_id", accountId)
        .order("date", { ascending: false });

      if (cancelled) return;
      if (error || !data) {
        setStats({ yesterday: 0, week: 0, month: 0, allTime: 0, massDMs: null, openChats: null, oldestChat: null });
        setLoading(false);
        return;
      }

      const yISO = iso(yesterday);
      const wISO = iso(weekStart);
      const mISO = iso(monthStart);

      let yesterdayRev = 0, weekRev = 0, monthRev = 0, allTime = 0;
      let massDMs = 0, openChats = 0, oldestChat = 0;
      let latestDate = "";

      for (const row of data as any[]) {
        const t = Number(row.total || 0);
        allTime += t;
        if (row.date >= mISO) monthRev += t;
        if (row.date >= wISO) weekRev += t;
        if (row.date === yISO) yesterdayRev += t;
        if (!latestDate || row.date > latestDate) {
          latestDate = row.date;
          massDMs = Number(row.mass_dms || 0);
          openChats = Number(row.unread_chats || 0);
          oldestChat = Number(row.oldest_chat || 0);
        }
      }

      setStats({
        yesterday: Math.round(yesterdayRev),
        week: Math.round(weekRev),
        month: Math.round(monthRev),
        allTime: Math.round(allTime),
        massDMs,
        openChats,
        oldestChat,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [accountId]);

  if (loading || !stats) {
    return (
      <div className="px-3.5 pb-3 pt-1 space-y-1.5 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 bg-muted/30 rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-3.5 pb-3 pt-1 space-y-1.5">
      {[
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
