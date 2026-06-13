import { useEffect, useMemo, useState, useRef } from "react";
import { format } from "date-fns";
import { CalendarIcon, Download, Search, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ChatterLite {
  id?: string;
  user_id?: string | null;
  group_name: string;
  telegram_id?: string;
  start_date?: string | null;
  created_at?: string;
}

interface Props {
  chatters: ChatterLite[];
}

interface Bucket { start: string; end: string; total: number; }

interface Row {
  key: string;
  user_id: string;
  name: string;
  telegram_id?: string;
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
  daily: { date: string; total: number }[];
  weekly: Bucket[];
  monthly: Bucket[];
  platform: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export default function ChatterReportsTab({ chatters }: Props) {
  const [date, setDate] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportFor, setReportFor] = useState<Row | null>(null);

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
      const historyStart = iso(addDays(date, -160));

      // Assignments
      const { data: assignments } = await supabase
        .from("account_assignments")
        .select("account_id,user_id,start_date,end_date")
        .in("user_id", userIds);

      const accountIds = Array.from(new Set((assignments ?? []).map((a: any) => a.account_id)));

      // Accounts → platform map
      const platformByAccount = new Map<string, string>();
      for (let i = 0; i < accountIds.length; i += 100) {
        const slice = accountIds.slice(i, i + 100);
        const { data: accs } = await supabase
          .from("accounts")
          .select("id,platform")
          .in("id", slice);
        (accs ?? []).forEach((a: any) => platformByAccount.set(a.id, a.platform || "Unknown"));
      }

      // Accounts data up to selected date, last ~160 days
      let allData: any[] = [];
      const BATCH = 100;
      for (let i = 0; i < accountIds.length; i += BATCH) {
        const slice = accountIds.slice(i, i + BATCH);
        const { data } = await supabase
          .from("accounts_data")
          .select("account_id,date,total,mass_dms,unread_chats,oldest_chat")
          .in("account_id", slice)
          .lte("date", selISO)
          .gte("date", historyStart);
        if (data) allData = allData.concat(data);
      }

      // Also fetch all-time totals separately (sum across all dates up to selISO)
      let allTimeData: any[] = [];
      for (let i = 0; i < accountIds.length; i += BATCH) {
        const slice = accountIds.slice(i, i + BATCH);
        const { data } = await supabase
          .from("accounts_data")
          .select("account_id,date,total")
          .in("account_id", slice)
          .lte("date", selISO)
          .lt("date", historyStart);
        if (data) allTimeData = allTimeData.concat(data);
      }

      // Goals + start dates from profiles
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,start_date,created_at,daily_goal")
        .in("user_id", userIds);
      const goalMap = new Map<string, number>();
      const startMap = new Map<string, string | null>();
      (profs ?? []).forEach((p: any) => {
        goalMap.set(p.user_id, Number(p.daily_goal || 0));
        startMap.set(p.user_id, p.start_date ?? (p.created_at ? String(p.created_at).slice(0, 10) : null));
      });

      if (cancelled) return;

      const dataByAccount = new Map<string, any[]>();
      for (const r of allData) {
        const arr = dataByAccount.get(r.account_id) ?? [];
        arr.push(r);
        dataByAccount.set(r.account_id, arr);
      }
      const olderByAccount = new Map<string, any[]>();
      for (const r of allTimeData) {
        const arr = olderByAccount.get(r.account_id) ?? [];
        arr.push(r);
        olderByAccount.set(r.account_id, arr);
      }

      const asgByUser = new Map<string, any[]>();
      for (const a of assignments ?? []) {
        const arr = asgByUser.get(a.user_id) ?? [];
        arr.push(a);
        asgByUser.set(a.user_id, arr);
      }

      const out: Row[] = [];
      for (const c of chatters) {
        const uid = c.user_id;
        if (!uid) continue;
        const allAsgs = asgByUser.get(uid) ?? [];
        if (allAsgs.length === 0) continue;

        // Group assignments by platform
        const asgByPlatform = new Map<string, any[]>();
        for (const a of allAsgs) {
          const p = platformByAccount.get(a.account_id);
          if (!p) continue;
          const arr = asgByPlatform.get(p) ?? [];
          arr.push(a);
          asgByPlatform.set(p, arr);
        }

        for (const [platform, asgs] of asgByPlatform.entries()) {
          const inWindow = (d: string) => {
            for (const a of asgs) {
              const s = a.start_date;
              const e = a.end_date || selISO;
              if (s && d >= s && d <= e) return true;
            }
            return false;
          };

          let all_time = 0;
          let mass_dms = 0, unread = 0, oldest = 0;
          const totalByDate = new Map<string, number>();
          const latestByAccount = new Map<string, any>();

          for (const a of asgs) {
            const rowsA = dataByAccount.get(a.account_id) ?? [];
            for (const r of rowsA) {
              if (!inWindow(r.date)) continue;
              const t = Number(r.total || 0);
              all_time += t;
              totalByDate.set(r.date, (totalByDate.get(r.date) || 0) + t);
              const prev = latestByAccount.get(a.account_id);
              if (!prev || r.date > prev.date) latestByAccount.set(a.account_id, r);
            }
            const older = olderByAccount.get(a.account_id) ?? [];
            for (const r of older) {
              if (!inWindow(r.date)) continue;
              all_time += Number(r.total || 0);
            }
          }

          for (const r of latestByAccount.values()) {
            mass_dms += Number(r.mass_dms || 0);
            unread += Number(r.unread_chats || 0);
            oldest = Math.max(oldest, Number(r.oldest_chat || 0));
          }

          const daily: { date: string; total: number }[] = [];
          for (let i = 9; i >= 0; i--) {
            const d = iso(addDays(date, -i));
            daily.push({ date: d, total: totalByDate.get(d) || 0 });
          }

          const weekly: Bucket[] = [];
          for (let w = 4; w >= 0; w--) {
            const end = addDays(date, -7 * w);
            const start = addDays(end, -6);
            let total = 0;
            for (let i = 0; i < 7; i++) {
              const d = iso(addDays(start, i));
              total += totalByDate.get(d) || 0;
            }
            weekly.push({ start: iso(start), end: iso(end), total });
          }

          const monthly: Bucket[] = [];
          for (let m = 4; m >= 0; m--) {
            const start = new Date(date.getFullYear(), date.getMonth() - m, 1);
            const end = new Date(date.getFullYear(), date.getMonth() - m + 1, 0);
            let total = 0;
            const endIter = m === 0 ? date : end;
            for (let d = new Date(start); d <= endIter; d = addDays(d, 1)) {
              total += totalByDate.get(iso(d)) || 0;
            }
            monthly.push({ start: iso(start), end: iso(end), total });
          }

          const day = totalByDate.get(selISO) || 0;
          const week = weekly[weekly.length - 1].total;
          const prev_week = weekly[weekly.length - 2]?.total || 0;
          const month = monthly[monthly.length - 1].total;
          const prev_month = monthly[monthly.length - 2]?.total || 0;

          const goalForUser = goalMap.get(uid) || 0;
          let streak = 0;
          if (goalForUser > 0) {
            for (let i = 0; i < 365; i++) {
              const d = iso(addDays(date, -i));
              if ((totalByDate.get(d) || 0) >= goalForUser) streak++;
              else break;
            }
          }

          const fallbackStart =
            startMap.get(uid) ??
            c.start_date ??
            (c.created_at ? String(c.created_at).slice(0, 10) : null);

          out.push({
            key: `${c.id ?? uid}__${platform}`,
            user_id: uid,
            name: c.group_name || c.telegram_id || uid.slice(0, 8),
            telegram_id: c.telegram_id,
            day, week, month, prev_week, prev_month, all_time,
            mass_dms, unread, oldest, streak,
            goal: goalMap.get(uid) || 0,
            start_date: fallbackStart,
            daily, weekly, monthly,
            platform,
          });
        }
      }

      setRows(out);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [chatters, date]);

  const platformList = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.platform));
    return Array.from(set).sort();
  }, [rows]);

  const [activePlatform, setActivePlatform] = useState<string>("");
  useEffect(() => {
    if (platformList.length && !platformList.includes(activePlatform)) {
      setActivePlatform(platformList[0]);
    }
  }, [platformList, activePlatform]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = rows;
    if (activePlatform) base = base.filter((r) => r.platform === activePlatform);
    if (!q) return base;
    return base.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search, activePlatform]);

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
    const safePlatform = (activePlatform || "all").toLowerCase().replace(/\s+/g, "-");
    a.href = url; a.download = `chatter-report-${safePlatform}-${iso(date)}.csv`;
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

  const TrendIcon = ({ curr, prev }: { curr: number; prev: number }) => {
    if (prev <= 0) return null;
    const up = curr >= prev;
    return up
      ? <TrendingUp className="h-3 w-3 text-emerald-400" />
      : <TrendingDown className="h-3 w-3 text-rose-400" />;
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

      {/* Platform Tabs */}
      <Tabs value={activePlatform} onValueChange={setActivePlatform} className="w-full">
        <TabsList className="bg-card/60 border border-border/40 backdrop-blur-xl flex-wrap h-auto">
          {platformList.map((p) => {
            const count = rows.filter((r) => r.platform === p).length;
            return (
              <TabsTrigger key={p} value={p} className="data-[state=active]:bg-[hsl(var(--gold))]/15 data-[state=active]:text-[hsl(var(--gold))]">
                {p} <span className="ml-1.5 text-[10px] text-muted-foreground">({count})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-border/40 backdrop-blur-xl overflow-hidden">
        <div className="text-center py-2.5 border-b border-border/30 bg-[hsl(var(--gold))]/5">
          <span className="text-sm font-semibold text-[hsl(var(--gold))] tracking-wide">{activePlatform} — {format(date, "yyyy-MM-dd")}</span>
        </div>


        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-card/40">
                {["Name", "Revenue", "Goal", "Streak", "MassDM Sent", "Chats Unread / Oldest", "Start Date", "Revenue (All Time)"].map((h) => (
                  <th key={h} className={cn("px-4 py-3 text-left text-[11px] font-bold tracking-wider uppercase text-[hsl(var(--gold))]/80", h === "Name" && "w-[210px] max-w-[210px]")} style={h === "Name" ? { width: 210, maxWidth: 210 } : undefined}>{h}</th>
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
                <tr key={r.key} className="border-b border-border/20 hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-4 w-[210px] max-w-[210px]" style={{ width: 210, maxWidth: 210 }}>
                    <div className="font-bold text-foreground truncate" title={r.name}>{r.name.toUpperCase()}</div>
                    {r.telegram_id && (
                      <div className="text-[10px] text-muted-foreground truncate" title={r.telegram_id}>@{r.telegram_id}</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1.5 w-[190px]">
                      {/* D — hover */}
                      <HoverCard openDelay={120}>
                        <HoverCardTrigger asChild>
                          <div className="px-2.5 py-1 rounded-md border border-border/40 bg-background/40 text-xs text-center font-medium cursor-default">
                            D: {fmt(r.day)}€
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-56 p-3 bg-popover/95 backdrop-blur-xl border-[hsl(var(--gold))]/30">
                          <div className="text-[11px] font-semibold text-[hsl(var(--gold))] mb-2 uppercase tracking-wider">Last 10 Days</div>
                          <div className="space-y-1">
                            {r.daily.map((d) => (
                              <div key={d.date} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground tabular-nums">{d.date}</span>
                                <span className="font-medium tabular-nums">{fmt(d.total)}€</span>
                              </div>
                            ))}
                          </div>
                        </HoverCardContent>
                      </HoverCard>

                      {/* W — click */}
                      <button
                        onClick={() => setReportFor(r)}
                        className="px-2.5 py-1.5 rounded-md border border-border/40 bg-background/40 text-center hover:border-[hsl(var(--gold))]/50 hover:bg-[hsl(var(--gold))]/5 transition-colors"
                      >
                        <div className="text-xs font-medium flex items-center justify-center gap-1.5">
                          W: {fmt(r.week)}€ <TrendIcon curr={r.week} prev={r.prev_week} />
                        </div>
                        <DeltaChip curr={r.week} prev={r.prev_week} label="vs prev week" />
                      </button>

                      {/* M — click */}
                      <button
                        onClick={() => setReportFor(r)}
                        className="px-2.5 py-1.5 rounded-md border border-border/40 bg-background/40 text-center hover:border-[hsl(var(--gold))]/50 hover:bg-[hsl(var(--gold))]/5 transition-colors"
                      >
                        <div className="text-xs font-medium flex items-center justify-center gap-1.5">
                          M: {fmt(r.month)}€ <TrendIcon curr={r.month} prev={r.prev_month} />
                        </div>
                        <DeltaChip curr={r.month} prev={r.prev_month} label="vs prev month" />
                      </button>
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

      {/* Weekly / Monthly Report Dialog */}
      <Dialog open={!!reportFor} onOpenChange={(o) => !o && setReportFor(null)}>
        <DialogContent className="max-w-3xl bg-background/95 backdrop-blur-2xl border-[hsl(var(--gold))]/30">
          <DialogHeader>
            <DialogTitle className="text-[hsl(var(--gold))]">
              Revenue Report — {reportFor?.name.toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          {reportFor && (
            <div className="space-y-6">
              {/* Weekly */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--gold))]/80 mb-2">Weekly Revenue (last 5 weeks)</div>
                <div className="overflow-x-auto rounded-lg border border-border/40">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-card/40">
                        {reportFor.weekly.map((b) => (
                          <th key={b.start} className="px-3 py-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                            {b.start}<br/>→ {b.end}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {reportFor.weekly.map((b, i) => {
                          const prev = reportFor.weekly[i - 1]?.total || 0;
                          return (
                            <td key={b.start} className="px-3 py-3 text-center font-semibold tabular-nums">
                              <div className="flex items-center justify-center gap-1.5">
                                {fmt(b.total)}€
                                {i > 0 && <TrendIcon curr={b.total} prev={prev} />}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--gold))]/80 mb-2">Monthly Revenue (last 5 months)</div>
                <div className="overflow-x-auto rounded-lg border border-border/40">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-card/40">
                        {reportFor.monthly.map((b) => (
                          <th key={b.start} className="px-3 py-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                            {b.start.slice(0, 7)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {reportFor.monthly.map((b, i) => {
                          const prev = reportFor.monthly[i - 1]?.total || 0;
                          return (
                            <td key={b.start} className="px-3 py-3 text-center font-semibold tabular-nums">
                              <div className="flex items-center justify-center gap-1.5">
                                {fmt(b.total)}€
                                {i > 0 && <TrendIcon curr={b.total} prev={prev} />}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
