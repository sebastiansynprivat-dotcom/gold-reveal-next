import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface RevenueChartProps {
  userId: string;
}

export default function RevenueChart({ userId }: RevenueChartProps) {
  const [data, setData] = useState<{ day: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const today = new Date();
      const from = format(subDays(today, 6), "yyyy-MM-dd");
      const to = format(today, "yyyy-MM-dd");

      const { data: rows } = await supabase
        .from("daily_revenue")
        .select("date, amount")
        .eq("user_id", userId)
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: true });

      // Build full 7-day array, fill missing days with 0
      const mapped: { day: string; amount: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = format(subDays(today, i), "yyyy-MM-dd");
        const entry = rows?.find((r) => r.date === d);
        mapped.push({
          day: format(new Date(d), "EEE", { locale: de }),
          amount: entry ? Number(entry.amount) : 0,
        });
      }
      setData(mapped);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="glass-card-subtle rounded-xl p-4 h-[180px] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.amount, 0);
  const firstHalf = data.slice(0, 3).reduce((s, d) => s + d.amount, 0);
  const secondHalf = data.slice(4).reduce((s, d) => s + d.amount, 0);
  const trend = secondHalf > firstHalf ? "up" : secondHalf < firstHalf ? "down" : "flat";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card-subtle rounded-xl p-4 card-inner-glow"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground">Letzte 7 Tage</p>
        <div className="flex items-center gap-1.5">
          {trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-green-400" />}
          {trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
          {trend === "flat" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-sm font-bold text-foreground">
            {total.toLocaleString("de-DE")}€
          </span>
        </div>
      </div>
      <div className="h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(43, 76%, 46%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(43, 76%, 46%)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(0, 0%, 55%)" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(0, 0%, 55%)" }}
              tickFormatter={(v) => `${v}€`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(0, 0%, 7%)",
                border: "1px solid hsl(43, 30%, 20%)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(43, 56%, 52%)",
              }}
              formatter={(value: number) => [`${value.toLocaleString("de-DE")}€`, "Umsatz"]}
              labelStyle={{ color: "hsl(0, 0%, 55%)" }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="hsl(43, 76%, 46%)"
              strokeWidth={2}
              fill="url(#goldGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
