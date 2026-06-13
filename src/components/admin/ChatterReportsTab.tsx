import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Download, Search, TrendingDown, TrendingUp } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ChatterLite {
  user_id: string;
  group_name: string;
  telegram_id?: string;
  start_date?: string | null;
}

interface Props {
  chatters: ChatterLite[];
}

interface Row {
  user_id: string;
  name: string;
  day: number;
  week: number;
  month: number;
  prev_week: number;
  prev_month: number;
  all_time: number;
  mass_dms: number;
  unread: number;
  oldest: number;
  streak: number;
  goal: number;
  start_date: string | null;
}

const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export default function ChatterReportsTab({ chatters }: Props) {
  const [date, setDate] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const userIds = chatters.map((c) => c.user_id).filter(Boolean);
      if (userIds.length === 0) { setRows([]); setLoading(false); return; }

      const selISO = iso(date);
      const weekStart = iso(addDays(date, -6));
      const prevWeekStart = iso(addDays(date, -13));
      const prevWeekEnd = iso(addDays(date, -7));
      const monthStart = iso(new Date(date.getFullYear(), date.getMonth(), 1));
      const prevMonthStart = iso(new Date(date.getFullYear(), date.getMonth() - 1, 1));
      const prevMonthEnd = iso(new Date(date.getFullYear(), date.getMonth(), 0));

      // Assignments
      const { data: assignments } = await supabase
        .from("account_assignments")
        .select("account_id,user_id,start_date,end_date")
        .in("user_id", userIds);

      const accountIds = Array.from(new Set((assignments ?? []).map((a: any) => a.account_id)));

      // Accounts data up to selected date
      let allData: any[] = [];
      const BATCH = 100;
      for (let i = 0; i < accountIds.length; i += BATCH) {
        const slice = accountIds.slice(i, i + BATCH);
        const { data } = await supabase
          .from("accounts_data")
          .select("account_id,date,total,mass_dms,unread_chats,oldest_chat")
          .in("account_id", slice)
          .lte("date", selISO);
        if (data) allData = allData.concat(data);
      }

      // Goals
      const { data: goals } = await supabase
        .from("daily_goals")
        .select("user_id,target_amount")
        .in("user_id", userIds);
      const goalMap = new Map<string, number>();
      (goals ?? []).forEach((g: any) => goalMap.set(g.user_id, Number(g.target_amount || 0)));

      if (cancelled) return;

      // Index data by account
      const dataByAccount = new Map<string, any[]>();
      for (const r of allData) {
        const arr = dataByAccount.get(r.account_id) ?? [];
        arr.push(r);
        dataByAccount.set(r.account_id, arr);
      }

      // Assignments by user
      const asgByUser = new Map<string, any[]>();
      for (const a of assignments ?? []) {
        const arr = asgByUser.get(a.user_id) ?? [];
        arr.push(a);
        asgByUser.set(a.user_id, arr);
      }

      const out: Row[] = chatters.map((c) => {
        const asgs = asgByUser.get(c.user_id) ?? [];
        const inWindow = (d: string) => {
          for (const a of asgs) {
            const s = a.start_date;
            const e = a.end_date || selISO;
            if (s && d >= s && d <= e) return true;
          }
          return false;
        };

        let day = 0, week = 0, month = 0, all_time = 0, prev_week = 0, prev_month = 0;
        let mass_dms = 0, unread = 0, oldest = 0;

        // streak: walk backward day by day from selISO
        const totalByDate = new Map<string, number>();
        const latestByAccount = new Map<string, any>();

        for (const a of asgs) {
          const rowsA = dataByAccount.get(a.account_id) ?? [];
          for (const r of rowsA) {
            if (!inWindow(r.date)) continue;
            const t = Number(r.total || 0);
            all_time += t;
            if (r.date === selISO) day += t;
            if (r.date >= weekStart && r.date <= selISO) week += t;
            if (r.date >= monthStart && r.date <= selISO) month += t;
            if (r.date >= prevWeekStart && r.date <= prevWeekEnd) prev_week += t;
            if (r.date >= prevMonthStart && r.date <= prevMonthEnd) prev_month += t;
            totalByDate.set(r.date, (totalByDate.get(r.date) || 0) + t);
            const prev = latestByAccount.get(a.account_id);
            if (!prev || r.date > prev.date) latestByAccount.set(a.account_id, r);
          }
        }

        for (const r of latestByAccount.values()) {
          mass_dms += Number(r.mass_dms || 0);
          unread += Number(r.unread_chats || 0);
          oldest = Math.max(oldest, Number(r.oldest_chat || 0));
        }

        // Streak: consecutive days with >0 revenue going back from selISO
        let streak = 0;
        for (let i = 0; i < 365; i++) {
          const d = iso(addDays(date, -i));
          if ((totalByDate.get(d) || 0) > 0) streak++;
          else break;
        }

        return {
          user_id: c.user_id,
          name: c.group_name || c.telegram_id || c.user_id.slice(0, 8),
          day, week, month, prev_week, prev_month, all_time,
          mass_dms, unread, oldest, streak,
          goal: goalMap.get(c.user_id) || 0,
          start_date: c.start_date ?? null,
        };
      });

      setRows(out);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [chatters, date]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const downloadCSV = () => {
    const headers = ["Name", "Day (€)", "Week (€)", "Month (€)", "Week Δ%", "Month Δ%", "Goal (€)", "Streak (days)", "MassDM Sent", "Chats Unread", "Oldest Unread (days)", "Start Date", "Revenue All Time (€)"];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      const wDelta = r.prev_week > 0 ? ((r.week - r.prev_week) / r.prev_week) * 100 : 0;
      const mDelta = r.prev_month > 0 ? ((r.month - r.prev_month) / r.prev_month) * 100 : 0;
      lines.push([
        `"${r.name}"`, fmt(r.day), fmt(r.week), fmt(r.month),
        wDelta.toFixed(1), mDelta.toFixed(1),
        fmt(r.goal), r.streak, r.mass_dms, r.unread, r.oldest,
        r.start_date ?? "", fmt(r.all_time),
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `chatter-report-${iso(date)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const DeltaChip = ({ curr, prev, label }: { curr: number; prev: number; label: string }) => {
    if (prev <= 0) return null;
    const pct = ((curr - prev) / prev) * 100;
    const up = pct >= 0;
    return (
      <div className={cn("text-[10px] font-semibold flex items-center justify-center gap-1", up ? "text-emerald-400" : "text-rose-400")}>
        {Math.abs(pct).toFixed(1)}% {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        <span className="text-[9px] text-muted-foreground font-normal ml-1">{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Chatters…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/60 border-border/40 backdrop-blur-xl"
          />
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="bg-card/60 border-[hsl(var(--gold))]/40 backdrop-blur-xl text-[hsl(var(--gold))] hover:text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/10">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "yyyy-MM-dd")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <Button onClick={downloadCSV} variant="outline" className="bg-card/60 border-[hsl(var(--gold))]/40 backdrop-blur-xl text-[hsl(var(--gold))] hover:text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/10">
            <Download className="mr-2 h-4 w-4" /> Download Report
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-border/40 backdrop-blur-xl overflow-hidden">
        <div className="text-center py-2.5 border-b border-border/30 bg-[hsl(var(--gold))]/5">
          <span className="text-sm font-semibold text-[hsl(var(--gold))] tracking-wide">{format(date, "yyyy-MM-dd")}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-card/40">
                {["Name", "Revenue", "Goal", "Streak", "MassDM Sent", "Chats Unread / Oldest", "Start Date", "Revenue (All Time)"].map((h) => (
                  <th key={h} className={cn("px-4 py-3 text-left text-[11px] font-bold tracking-wider uppercase text-[hsl(var(--gold))]/80", h === "Name" && "w-[120px]")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No chatters match.</td></tr>
              )}
              {!loading && filtered.map((r) => (
                <tr key={r.user_id} className="border-b border-border/20 hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-4 font-bold text-foreground whitespace-nowrap">{r.name.toUpperCase()}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1.5 w-[170px]">
                      <div className="px-2.5 py-1 rounded-md border border-border/40 bg-background/40 text-xs text-center font-medium">D: {fmt(r.day)}€</div>
                      <div className="px-2.5 py-1.5 rounded-md border border-border/40 bg-background/40 text-center">
                        <div className="text-xs font-medium">W: {fmt(r.week)}€</div>
                        <DeltaChip curr={r.week} prev={r.prev_week} label="last vs previous week" />
                      </div>
                      <div className="px-2.5 py-1.5 rounded-md border border-border/40 bg-background/40 text-center">
                        <div className="text-xs font-medium">M: {fmt(r.month)}€</div>
                        <DeltaChip curr={r.month} prev={r.prev_month} label="last vs previous month" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm">{r.goal > 0 ? `${fmt(r.goal)}€` : "0"}</td>
                  <td className="px-4 py-4 text-sm whitespace-nowrap">{r.streak} days</td>
                  <td className="px-4 py-4 text-sm whitespace-nowrap">{r.mass_dms} DMs Sent</td>
                  <td className="px-4 py-4 text-center">
                    <div className="text-sm">{r.unread} unread</div>
                    <div className="text-xs text-muted-foreground bg-muted/30 inline-block px-2 py-0.5 rounded-md mt-1">{r.oldest} days ago</div>
                  </td>
                  <td className="px-4 py-4 text-sm whitespace-nowrap">{r.start_date ?? "–"}</td>
                  <td className="px-4 py-4 text-sm font-semibold text-[hsl(var(--gold))] whitespace-nowrap">{fmt(r.all_time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
