import { useEffect, useMemo, useState, useRef } from "react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";
import { CalendarIcon, Download, Search, TrendingDown, TrendingUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
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
  user_id: string | null;
  profile_id: string;
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
  models: string[];
}

const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function GoalCell({ value, onSave }: { value: number; onSave: (next: number) => void | Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value || 0));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(String(value || 0)); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    const n = Math.max(0, Math.round(Number(draft.replace(",", ".")) || 0));
    setEditing(false);
    if (n !== value) onSave(n);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { e.preventDefault(); setDraft(String(value || 0)); setEditing(false); }
        }}
        className="w-24 px-2 py-1 rounded-md border border-[hsl(var(--gold))]/50 bg-background/60 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/40"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm px-2 py-1 rounded-md hover:bg-[hsl(var(--gold))]/10 hover:text-[hsl(var(--gold))] transition-colors"
      title="Click to edit goal"
    >
      {value > 0 ? `${fmt(value)}€` : <span className="text-muted-foreground">—</span>}
    </button>
  );
}

type AccountDataPoint = { date: string; total: number; mass_dms: number; unread_chats: number; oldest_chat: number };
type AssignmentWindow = { start_date: string | null; end_date: string | null };

export default function ChatterReportsTab({ chatters }: Props) {
  const [date, setDate] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportFor, setReportFor] = useState<Row | null>(null);

  // Per-model report data — populated alongside `rows`, consumed by buildReport.
  // profileId -> platform -> model display -> Set<accountId>
  const modelAccountsRef = useRef<Map<string, Map<string, Map<string, Set<string>>>>>(new Map());
  // `${profileId}|${accountId}` -> assignment windows
  const windowsRef = useRef<Map<string, AssignmentWindow[]>>(new Map());
  // accountId -> daily rows (any order)
  const accountsDataRef = useRef<Map<string, AccountDataPoint[]>>(new Map());


  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // Eligible: any chatter with a telegram_id (raw, what ingest writes)
      const eligible = chatters.filter((c) => !!c.telegram_id && !!c.id);
      if (eligible.length === 0) { setRows([]); setLoading(false); return; }

      const userIds = Array.from(new Set(eligible.map((c) => c.user_id).filter(Boolean) as string[]));
      const profileIds = Array.from(new Set(eligible.map((c) => c.id).filter(Boolean) as string[]));
      const telegramIds = Array.from(new Set(eligible.map((c) => c.telegram_id!).filter(Boolean)));

      const selISO = iso(date);
      const lastWeekStartD = startOfWeek(subWeeks(date, 1), { weekStartsOn: 1 });
      const lastWeekEndD = endOfWeek(subWeeks(date, 1), { weekStartsOn: 1 });
      const weekStart = iso(lastWeekStartD);
      const weekEnd = iso(lastWeekEndD);
      const prevWeekStartD = startOfWeek(subWeeks(date, 2), { weekStartsOn: 1 });
      const prevWeekEndD = endOfWeek(subWeeks(date, 2), { weekStartsOn: 1 });
      const prevWeekStart = iso(prevWeekStartD);
      const prevWeekEnd = iso(prevWeekEndD);
      const lastMonthStartD = startOfMonth(subMonths(date, 1));
      const lastMonthEndD = endOfMonth(subMonths(date, 1));
      const monthStart = iso(lastMonthStartD);
      const monthEnd = iso(lastMonthEndD);
      const prevMonthStartD = startOfMonth(subMonths(date, 2));
      const prevMonthEndD = endOfMonth(subMonths(date, 2));
      const prevMonthStart = iso(prevMonthStartD);
      const prevMonthEnd = iso(prevMonthEndD);

      // ----- Fire independent fetches in parallel -----
      const asgByUserP = userIds.length > 0
        ? supabase.from("account_assignments").select("account_id,user_id,profile_id,start_date,end_date").in("user_id", userIds).is("end_date", null)
        : Promise.resolve({ data: [] as any[] });
      const asgByProfileP = profileIds.length > 0
        ? supabase.from("account_assignments").select("account_id,user_id,profile_id,start_date,end_date").in("profile_id", profileIds).is("end_date", null)
        : Promise.resolve({ data: [] as any[] });

      const profsP = profileIds.length > 0
        ? supabase.from("profiles").select("id,user_id,start_date,created_at,daily_goal").in("id", profileIds)
        : Promise.resolve({ data: [] as any[] });

      // profiles_data: run all telegram-id batches concurrently; paginate within each batch
      const BATCH = 50;
      const PAGE = 1000;
      const telegramSlices: string[][] = [];
      for (let i = 0; i < telegramIds.length; i += BATCH) telegramSlices.push(telegramIds.slice(i, i + BATCH));
      const profilesDataP = Promise.all(telegramSlices.map(async (slice) => {
        const collected: any[] = [];
        let from = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data, error } = await supabase
            .from("profiles_data")
            .select("telegram_id,date,revenue,mass_dm,unread_chats,oldest_chat")
            .in("telegram_id", slice)
            .lte("date", selISO)
            .order("date", { ascending: false })
            .range(from, from + PAGE - 1);
          if (error || !data || data.length === 0) break;
          collected.push(...data);
          if (data.length < PAGE) break;
          from += PAGE;
        }
        return collected;
      }));

      const [asgByUserRes, asgByProfileRes, profsRes, profilesDataChunks] = await Promise.all([
        asgByUserP, asgByProfileP, profsP, profilesDataP,
      ]);
      if (cancelled) return;

      const asgRows: any[] = [
        ...((asgByUserRes as any).data ?? []),
        ...((asgByProfileRes as any).data ?? []),
      ];

      // ----- accounts in parallel chunks -----
      const accountIds = Array.from(new Set(asgRows.map((a) => a.account_id)));
      const accountChunks: string[][] = [];
      for (let i = 0; i < accountIds.length; i += 100) accountChunks.push(accountIds.slice(i, i + 100));
      const accsResults = await Promise.all(accountChunks.map((slice) =>
        supabase.from("accounts").select("id,platform,username,account_email").in("id", slice)
      ));
      if (cancelled) return;
      const platformByAccount = new Map<string, string>();
      const displayByAccount = new Map<string, string>();
      for (const { data: accs } of accsResults) {
        (accs ?? []).forEach((a: any) => {
          platformByAccount.set(a.id, a.platform || "Unknown");
          const display =
            (a.username && String(a.username).trim()) ||
            (a.account_email && String(a.account_email).trim()) ||
            "";
          if (display) displayByAccount.set(a.id, display);
        });
      }

      // Resolve each assignment to a chatter (by user_id OR profile_id)
      const platformsByChatter = new Map<string, Set<string>>();
      const modelsByChatter = new Map<string, Set<string>>();
      const chatterByUser = new Map<string, any>();
      const chatterByProfile = new Map<string, any>();
      for (const c of eligible) {
        if (c.user_id) chatterByUser.set(c.user_id, c);
        if (c.id) chatterByProfile.set(c.id, c);
      }
      for (const a of asgRows) {
        const c = (a.user_id && chatterByUser.get(a.user_id)) || (a.profile_id && chatterByProfile.get(a.profile_id));
        if (!c) continue;
        const p = platformByAccount.get(a.account_id);
        if (!p) continue;
        if (!platformsByChatter.has(c.id)) platformsByChatter.set(c.id, new Set());
        platformsByChatter.get(c.id)!.add(p);
        const display = displayByAccount.get(a.account_id);
        if (display) {
          if (!modelsByChatter.has(c.id)) modelsByChatter.set(c.id, new Set());
          modelsByChatter.get(c.id)!.add(display);
        }
      }

      // ----- profiles_data -> map by telegram_id -----
      const dataByTelegram = new Map<string, any[]>();
      for (const chunk of profilesDataChunks) {
        for (const r of chunk) {
          const arr = dataByTelegram.get(r.telegram_id) ?? [];
          arr.push(r);
          dataByTelegram.set(r.telegram_id, arr);
        }
      }

      // ----- profiles (goal + start_date) -----
      const goalMap = new Map<string, number>();
      const startMap = new Map<string, string | null>();
      ((profsRes as any).data ?? []).forEach((p: any) => {
        goalMap.set(p.id, Number(p.daily_goal || 0));
        startMap.set(p.id, p.start_date ?? (p.created_at ? String(p.created_at).slice(0, 10) : null));
      });

      if (cancelled) return;

      const out: Row[] = [];
      for (const c of eligible) {
        const tid = c.telegram_id!;
        const rowsT = dataByTelegram.get(tid) ?? [];

        // totals by date
        const totalByDate = new Map<string, number>();
        for (const r of rowsT) {
          totalByDate.set(r.date, (totalByDate.get(r.date) || 0) + Number(r.revenue || 0));
        }

        // latest row for activity fields
        let latest: any = null;
        for (const r of rowsT) {
          if (!latest || r.date > latest.date) latest = r;
        }

        let all_time = 0;
        for (const v of totalByDate.values()) all_time += v;

        const sumRange = (s: string, e: string) => {
          let t = 0;
          for (const [d, v] of totalByDate) if (d >= s && d <= e) t += v;
          return t;
        };

        const day = totalByDate.get(selISO) || 0;
        const week = sumRange(weekStart, weekEnd);
        const prev_week = sumRange(prevWeekStart, prevWeekEnd);
        const month = sumRange(monthStart, monthEnd);
        const prev_month = sumRange(prevMonthStart, prevMonthEnd);

        const daily: { date: string; total: number }[] = [];
        for (let i = 9; i >= 0; i--) {
          const d = iso(addDays(date, -i));
          daily.push({ date: d, total: totalByDate.get(d) || 0 });
        }

        const weekly: Bucket[] = [];
        for (let w = 4; w >= 0; w--) {
          const ws = startOfWeek(subWeeks(date, w + 1), { weekStartsOn: 1 });
          const we = endOfWeek(subWeeks(date, w + 1), { weekStartsOn: 1 });
          weekly.push({ start: iso(ws), end: iso(we), total: sumRange(iso(ws), iso(we)) });
        }
        const monthly: Bucket[] = [];
        for (let m = 4; m >= 0; m--) {
          const ms = startOfMonth(subMonths(date, m + 1));
          const me = endOfMonth(subMonths(date, m + 1));
          monthly.push({ start: iso(ms), end: iso(me), total: sumRange(iso(ms), iso(me)) });
        }

        if (import.meta.env.DEV) {
          if (week > all_time + 0.001 || month > all_time + 0.001 || day > all_time + 0.001) {
            // eslint-disable-next-line no-console
            console.warn("[ChatterReports] invariant broken", { chatter: c.group_name, day, week, month, all_time });
          }
        }

        const goalForUser = goalMap.get(c.id!) || 0;
        let streak = 0;
        if (goalForUser > 0) {
          for (let i = 0; i < 365; i++) {
            const d = iso(addDays(date, -i));
            if ((totalByDate.get(d) || 0) >= goalForUser) streak++;
            else break;
          }
        }

        const fallbackStart =
          startMap.get(c.id!) ??
          c.start_date ??
          (c.created_at ? String(c.created_at).slice(0, 10) : null);

        const mass_dms = Number(latest?.mass_dm || 0);
        const unread = Number(latest?.unread_chats || 0);
        const oldest = Number(latest?.oldest_chat || 0);

        const platforms = Array.from(platformsByChatter.get(c.id!) ?? []);
        const modelsArr = Array.from(modelsByChatter.get(c.id!) ?? []);
        const bucketList = platforms.length > 0 ? platforms : ["Unassigned"];

        for (const platform of bucketList) {
          out.push({
            key: `${c.id}__${platform}`,
            user_id: c.user_id ?? null,
            profile_id: c.id!,
            name: c.group_name || c.telegram_id || (c.user_id ?? c.id!).slice(0, 8),
            telegram_id: c.telegram_id,
            day, week, month, prev_week, prev_month, all_time,
            mass_dms, unread, oldest, streak,
            goal: goalForUser,
            start_date: fallbackStart,
            daily, weekly, monthly,
            platform,
            models: modelsArr,
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

  const selectedIso = useMemo(() => format(date, "yyyy-MM-dd"), [date]);

  const dateScopedRows = useMemo(
    () => rows.filter((r) => !r.start_date || r.start_date.slice(0, 10) <= selectedIso),
    [rows, selectedIso],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = dateScopedRows;
    if (activePlatform) base = base.filter((r) => r.platform === activePlatform);
    if (!q) return base;
    return base.filter((r) => r.name.toLowerCase().includes(q));
  }, [dateScopedRows, search, activePlatform]);

  const buildReport = () => {
    const headers = [
      "Date", "Name", "Telegram ID", "Models",
      "Yesterday Revenue", "Goal", "Streak",
      "Last Week Revenue", "Last Month Revenue", "All Time Revenue",
      "Mass DM", "Unread Chats", "Oldest Chat",
      "Notes", "Start Date",
    ];
    const dateStr = format(date, "yyyy-MM-dd");
    const rowsOut: (string | number)[][] = filtered.map((r) => {
      const yesterday = r.daily && r.daily.length >= 2
        ? r.daily[r.daily.length - 2].total
        : 0;
      return [
        dateStr,
        r.name,
        r.telegram_id ?? "",
        (r.models ?? []).join(", "),
        yesterday,
        r.goal,
        r.streak,
        r.week,
        r.month,
        r.all_time,
        r.mass_dms,
        r.unread,
        r.oldest,
        "",
        r.start_date ? format(new Date(r.start_date), "yyyy-MM-dd") : "",
      ];
    });
    return { headers, rows: rowsOut, dateStr };
  };

  const downloadReport = (fmtKind: "xlsx" | "csv") => {
    const { headers, rows: rowsOut, dateStr } = buildReport();
    const platformName = activePlatform || "All";
    const safePlatform = platformName.replace(/\s+/g, "_");
    const filename = `${safePlatform}_Chatter_Report_${dateStr}.${fmtKind}`;

    if (fmtKind === "xlsx") {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rowsOut]);
      ws["!cols"] = headers.map((h) => ({ wch: Math.max(12, h.length + 2) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, platformName.slice(0, 31));
      XLSX.writeFile(wb, filename);
    } else {
      const esc = (v: string | number) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = [headers.map(esc).join(",")];
      for (const r of rowsOut) lines.push(r.map(esc).join(","));
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-card/60 border-[hsl(var(--gold))]/40 backdrop-blur-xl text-[hsl(var(--gold))] hover:text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/10">
                <Download className="mr-2 h-4 w-4" /> Download Report <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border-[hsl(var(--gold))]/30">
              <DropdownMenuItem onClick={() => downloadReport("xlsx")}>Download as XLSX</DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadReport("csv")}>Download as CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Platform Tabs */}
      <Tabs value={activePlatform} onValueChange={setActivePlatform} className="w-full">
        <TabsList className="bg-card/60 border border-border/40 backdrop-blur-xl flex-wrap h-auto">
          {platformList.map((p) => {
            const count = dateScopedRows.filter((r) => r.platform === p).length;
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
                  <td className="px-4 py-4 text-sm">
                    <GoalCell
                      value={r.goal}
                      onSave={async (next) => {
                        const prev = r.goal;
                        setRows((rs) => rs.map((x) => (x.profile_id === r.profile_id ? { ...x, goal: next } : x)));
                        const q = supabase.from("profiles").update({ daily_goal: next });
                        const { error } = await (r.user_id
                          ? q.eq("user_id", r.user_id)
                          : q.eq("id", r.profile_id));
                        if (error) {
                          setRows((rs) => rs.map((x) => (x.profile_id === r.profile_id ? { ...x, goal: prev } : x)));
                          toast.error("Failed to save goal");
                        } else {
                          toast.success("Goal updated");
                        }
                      }}
                    />
                  </td>
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
