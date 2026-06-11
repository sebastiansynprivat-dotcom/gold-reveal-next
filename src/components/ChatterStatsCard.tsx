import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, MessageSquare, Inbox, Clock } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

export interface RealChatterStats {
  today: number;
  week: number;
  month: number;
  all_time: number;
  prev_week: number;
  prev_month: number;
  mass_dms: number;
  open_chats: number;
  avg_open_days: number;
  sparkline: { week_start: string; total: number }[];
}

interface Props {
  userId: string;
  name: string;
  stats?: RealChatterStats | null;
}

const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");

export default function ChatterStatsCard({ userId, stats: statsProp }: Props) {
  const [stats, setStats] = useState<RealChatterStats | null>(statsProp ?? null);
  const [loading, setLoading] = useState(!statsProp);

  useEffect(() => {
    if (statsProp) {
      setStats(statsProp);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_chatter_real_stats", { p_user_ids: [userId] });
      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setStats({
          today: 0, week: 0, month: 0, all_time: 0, prev_week: 0, prev_month: 0,
          mass_dms: 0, open_chats: 0, avg_open_days: 0, sparkline: [],
        });
      } else {
        const r: any = data[0];
        setStats({
          today: Number(r.today || 0),
          week: Number(r.week || 0),
          month: Number(r.month || 0),
          all_time: Number(r.all_time || 0),
          prev_week: Number(r.prev_week || 0),
          prev_month: Number(r.prev_month || 0),
          mass_dms: Number(r.mass_dms || 0),
          open_chats: Number(r.open_chats || 0),
          avg_open_days: Number(r.avg_open_days || 0),
          sparkline: Array.isArray(r.sparkline) ? r.sparkline : [],
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, statsProp]);

  if (loading || !stats) {
    return (
      <div className="px-4 pb-4 space-y-3 animate-pulse">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/30 rounded-lg" />
          ))}
        </div>
        <div className="h-16 bg-muted/30 rounded-lg" />
        <div className="h-12 bg-muted/30 rounded-lg" />
      </div>
    );
  }

  const weekChange = stats.prev_week > 0
    ? Math.round(((stats.week - stats.prev_week) / stats.prev_week) * 1000) / 10
    : 0;
  const monthChange = stats.prev_month > 0
    ? Math.round(((stats.month - stats.prev_month) / stats.prev_month) * 1000) / 10
    : 0;

  const sparkData = (stats.sparkline.length ? stats.sparkline : Array.from({ length: 8 }, () => ({ total: 0 })))
    .map((s: any) => ({ v: Number(s.total || 0) }));

  return (
    <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-200">
      {/* Revenue Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-card-subtle rounded-lg p-2.5 text-center">
          <p className="text-[9px] text-muted-foreground mb-0.5">Heute</p>
          <p className="text-sm font-bold text-foreground">{fmt(stats.today)}€</p>
        </div>
        <div className="glass-card-subtle rounded-lg p-2.5 text-center">
          <p className="text-[9px] text-muted-foreground mb-0.5">Woche</p>
          <p className="text-sm font-bold text-foreground">{fmt(stats.week)}€</p>
        </div>
        <div className="glass-card-subtle rounded-lg p-2.5 text-center">
          <p className="text-[9px] text-muted-foreground mb-0.5">Monat</p>
          <p className="text-sm font-bold text-foreground">{fmt(stats.month)}€</p>
        </div>
      </div>

      {/* Trends */}
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card-subtle rounded-lg p-2.5">
          <p className="text-[9px] text-muted-foreground mb-1">vs. Vorwoche</p>
          <div className="flex items-center gap-1">
            {weekChange >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            )}
            <span className={`text-sm font-bold ${weekChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {weekChange >= 0 ? "+" : ""}{weekChange}%
            </span>
          </div>
        </div>
        <div className="glass-card-subtle rounded-lg p-2.5">
          <p className="text-[9px] text-muted-foreground mb-1">vs. Vormonat</p>
          <div className="flex items-center gap-1">
            {monthChange >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            )}
            <span className={`text-sm font-bold ${monthChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {monthChange >= 0 ? "+" : ""}{monthChange}%
            </span>
          </div>
        </div>
      </div>

      {/* Sparkline */}
      <div className="glass-card-subtle rounded-lg p-2.5">
        <p className="text-[9px] text-muted-foreground mb-1">Einnahmen-Trend (8 Wochen)</p>
        <div className="h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-card-subtle rounded-lg p-2.5 text-center">
          <MessageSquare className="h-3.5 w-3.5 text-accent mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground">{stats.mass_dms}</p>
          <p className="text-[8px] text-muted-foreground">Mass-DMs</p>
        </div>
        <div className="glass-card-subtle rounded-lg p-2.5 text-center">
          <Inbox className="h-3.5 w-3.5 text-amber-400 mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground">{stats.open_chats}</p>
          <p className="text-[8px] text-muted-foreground">Offene Chats</p>
        </div>
        <div className="glass-card-subtle rounded-lg p-2.5 text-center">
          <Clock className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground">{Math.round(stats.avg_open_days)}d</p>
          <p className="text-[8px] text-muted-foreground">Ø offen seit</p>
        </div>
      </div>

      {/* All-time Revenue */}
      <div className="gold-gradient-border-animated pulse-glow rounded-lg p-3 text-center">
        <p className="text-[9px] text-muted-foreground mb-0.5">Einnahmen All-Time</p>
        <p className="text-lg font-bold text-gold-gradient">{fmt(stats.all_time)}€</p>
      </div>
    </div>
  );
}
