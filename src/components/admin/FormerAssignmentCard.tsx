import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  accountId: string;
  userId: string;
  platform: string;
  accountDomain?: string | null;
  accountEmail?: string | null;
  startDate: string;
  endDate: string;
}

interface WindowStats {
  total: number;
  days: number;
  avgPerDay: number;
  massDMs: number;
  oldestChat: number;
  series: { date: string; total: number }[];
}

const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "–";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
};

const fmtShort = (iso: string) => {
  const [, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}.${m}.`;
};

export default function FormerAssignmentCard({
  accountId,
  userId,
  platform,
  accountDomain,
  accountEmail,
  startDate,
  endDate,
}: Props) {
  const [stats, setStats] = useState<WindowStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_account_chatter_stats_window", {
        p_account_id: accountId,
        p_user_id: userId,
        p_start: startDate,
        p_end: endDate,
      });
      if (cancelled) return;
      const r: any = Array.isArray(data) ? data[0] : data;
      if (error || !r) {
        setStats({ total: 0, days: 0, avgPerDay: 0, massDMs: 0, oldestChat: 0, series: [] });
      } else {
        setStats({
          total: Number(r.total || 0),
          days: Number(r.days || 0),
          avgPerDay: Number(r.avg_per_day || 0),
          massDMs: Number(r.mass_dms || 0),
          oldestChat: Number(r.oldest_chat || 0),
          series: Array.isArray(r.series)
            ? r.series.map((s: any) => ({ date: String(s.date).slice(0, 10), total: Number(s.total || 0) }))
            : [],
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, userId, startDate, endDate]);

  const chartData = (stats?.series || []).map((s) => ({ label: fmtShort(s.date), total: s.total }));
  const chartWidth = Math.max(chartData.length * 34, 320);

  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 opacity-80 overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-border/30">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground">{platform}</span>
          {accountDomain && <span className="text-[10px] text-muted-foreground/70">{accountDomain}</span>}
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
          {fmtDate(startDate)} – {fmtDate(endDate)}
          {accountEmail ? ` · ${accountEmail}` : ""}
        </p>
      </div>

      {loading || !stats ? (
        <div className="px-3.5 py-3 space-y-1.5 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 bg-muted/20 rounded" />
          ))}
        </div>
      ) : (
        <div className="px-3.5 py-3 space-y-1.5">
          {[
            { label: "Umsatz (Zeitraum)", value: `${fmt(stats.total)}€` },
            { label: "Tage", value: `${stats.days}` },
            { label: "Ø pro Tag", value: `${fmt(stats.avgPerDay)}€` },
            { label: "Mass-DMs (letzter Stand)", value: `${stats.massDMs}` },
            { label: "Ältester offener Chat", value: stats.oldestChat ? `${stats.oldestChat}d` : "–" },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between px-1">
              <span className="text-[11px] text-muted-foreground/80">{s.label}</span>
              <span className="text-xs font-semibold text-muted-foreground">{s.value}</span>
            </div>
          ))}

          {/* Revenue per date across the whole assignment period */}
          <div className="pt-2 mt-1 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground/70 px-1 mb-1">Umsatz pro Tag</p>
            {chartData.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/60 px-1 py-3">Keine Umsatzdaten im Zeitraum</p>
            ) : (
              <div className="overflow-x-auto">
                <LineChart
                  width={chartWidth}
                  height={130}
                  data={chartData}
                  margin={{ top: 6, right: 12, bottom: 0, left: 0 }}
                >
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "hsl(var(--muted-foreground))",
                    }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                    formatter={(value: number) => [`${fmt(value)}€`, "Umsatz"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
