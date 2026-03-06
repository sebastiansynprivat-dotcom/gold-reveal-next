import { useMemo } from "react";
import { TrendingUp, TrendingDown, MessageSquare, Inbox, Clock, DollarSign } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

// Generate fake weekly data for sparkline (last 8 weeks)
const generateSparkline = (seed: number) => {
  const data = [];
  let val = 400 + (seed % 300);
  for (let i = 0; i < 8; i++) {
    val += Math.floor(Math.random() * 200 - 60 + i * 15);
    data.push({ v: Math.max(100, val) });
  }
  return data;
};

// Deterministic-ish fake stats based on user_id hash
const hashCode = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

interface Props {
  userId: string;
  name: string;
}

export default function ChatterStatsCard({ userId, name }: Props) {
  const stats = useMemo(() => {
    const h = hashCode(userId);
    const today = 80 + (h % 200);
    const week = today * 5 + (h % 500);
    const month = week * 3.5 + (h % 2000);
    const allTime = month * 4 + (h % 10000);

    const prevWeek = week * (0.75 + (h % 30) / 100);
    const prevMonth = month * (0.7 + (h % 40) / 100);

    const weekChange = ((week - prevWeek) / prevWeek) * 100;
    const monthChange = ((month - prevMonth) / prevMonth) * 100;

    const massDMs = 120 + (h % 380);
    const openChats = 3 + (h % 18);
    const avgOpenDays = 1 + (h % 5);

    return {
      today: Math.round(today),
      week: Math.round(week),
      month: Math.round(month),
      allTime: Math.round(allTime),
      weekChange: Math.round(weekChange * 10) / 10,
      monthChange: Math.round(monthChange * 10) / 10,
      massDMs,
      openChats,
      avgOpenDays,
      sparkline: generateSparkline(h),
    };
  }, [userId]);

  const fmt = (n: number) => n.toLocaleString("de-DE");

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

      {/* Trends + Sparkline */}
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card-subtle rounded-lg p-2.5">
          <p className="text-[9px] text-muted-foreground mb-1">vs. Vorwoche</p>
          <div className="flex items-center gap-1">
            {stats.weekChange >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            )}
            <span className={`text-sm font-bold ${stats.weekChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {stats.weekChange >= 0 ? "+" : ""}{stats.weekChange}%
            </span>
          </div>
        </div>
        <div className="glass-card-subtle rounded-lg p-2.5">
          <p className="text-[9px] text-muted-foreground mb-1">vs. Vormonat</p>
          <div className="flex items-center gap-1">
            {stats.monthChange >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            )}
            <span className={`text-sm font-bold ${stats.monthChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {stats.monthChange >= 0 ? "+" : ""}{stats.monthChange}%
            </span>
          </div>
        </div>
      </div>

      {/* Sparkline */}
      <div className="glass-card-subtle rounded-lg p-2.5">
        <p className="text-[9px] text-muted-foreground mb-1">Einnahmen-Trend (8 Wochen)</p>
        <div className="h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.sparkline}>
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
          <p className="text-sm font-bold text-foreground">{stats.massDMs}</p>
          <p className="text-[8px] text-muted-foreground">Mass-DMs</p>
        </div>
        <div className="glass-card-subtle rounded-lg p-2.5 text-center">
          <Inbox className="h-3.5 w-3.5 text-amber-400 mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground">{stats.openChats}</p>
          <p className="text-[8px] text-muted-foreground">Offene Chats</p>
        </div>
        <div className="glass-card-subtle rounded-lg p-2.5 text-center">
          <Clock className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground">{stats.avgOpenDays}d</p>
          <p className="text-[8px] text-muted-foreground">Ø offen seit</p>
        </div>
      </div>

      {/* All-time Revenue */}
      <div className="gold-gradient-border-animated pulse-glow rounded-lg p-3 text-center">
        <p className="text-[9px] text-muted-foreground mb-0.5">Einnahmen All-Time</p>
        <p className="text-lg font-bold text-gold-gradient">{fmt(stats.allTime)}€</p>
      </div>
    </div>
  );
}
