import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  LogOut, CheckCircle2, Circle, CalendarDays, Sparkles, Link as LinkIcon, ExternalLink,
  Instagram, TrendingUp, TrendingDown, Minus, Flame, Film, Copy, KeyRound, HelpCircle,
  Rocket, Trophy, Eye, EyeOff,
} from "lucide-react";
import logo from "@/assets/logo.png";
import GoldParticles from "@/components/GoldParticles";

// New shape: { title, reference_url, notes }. Legacy may have `type`/title-as-URL.
type ContentItem = { title?: string; reference_url?: string; notes?: string; type?: string };

type PlanRow = {
  assignment_id: string;
  plan_id: string;
  plan_title: string;
  plan_description: string;
  start_date: string;
};

type DayRow = { plan_id: string; day_number: number; items: ContentItem[] };
type StatusRow = {
  id?: string;
  assignment_id: string;
  day_number: number;
  item_index: number;
  done: boolean;
  upload_url: string;
  note: string;
};

type ModelInfo = {
  id: string;
  name: string;
  instagram_url: string;
  instagram_urls: string[];
  platform_logins: { platform?: string; email?: string; password?: string; url?: string; username?: string }[];
};

type FollowerSnap = { instagram_url: string | null; followers: number; recorded_at: string };
type PostSnap = { instagram_url: string | null; posts_7d: number; posts_30d: number; last_post_at: string | null; recorded_at: string };

const WEEKDAYS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function mondayOf(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function normIg(u: string | null | undefined): string {
  if (!u) return "";
  let s = u.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
  s = s.replace(/^instagram\.[a-z.]+\//, "").replace(/^@/, "");
  s = s.split(/[?#]/)[0];
  return s.replace(/\/+$/, "");
}

function greetingFor(hour: number): string {
  if (hour < 5) return "Späte Nachtschicht";
  if (hour < 11) return "Guten Morgen";
  if (hour < 14) return "Hey";
  if (hour < 18) return "Guten Tag";
  if (hour < 22) return "Guten Abend";
  return "Späte Nacht";
}

function motivationFor(pct: number, doneToday: number, totalToday: number): { title: string; sub: string; emoji: string } {
  if (totalToday === 0 && pct >= 100) {
    return { title: "Du bist on fire", emoji: "🔥", sub: "Alles erledigt. Genau so wächst dein Account – konsequente Reels & Videos sind der schnellste Hebel für Reichweite und Umsatz." };
  }
  if (pct >= 100) return { title: "Alles erledigt", emoji: "🏆", sub: "Diese Konstanz zahlt direkt auf dein Wachstum ein. Weiter so – jedes Reel mehr bedeutet mehr Reach, mehr Subs, mehr Cash." };
  if (pct >= 75) return { title: "Fast geschafft", emoji: "🚀", sub: "Du bist auf einem starken Pfad. Die letzten Aufgaben heute durchziehen – Algorithmus liebt Konsistenz." };
  if (pct >= 40) return { title: "Solide unterwegs", emoji: "💪", sub: "Halte das Tempo. Je schneller dein Content live geht, desto schneller wächst dein Account – und damit dein Umsatz." };
  if (doneToday > 0) return { title: "Guter Start heute", emoji: "✨", sub: "Erste Aufgaben sind durch. Bleib dran – jedes Video heute ist Reichweite morgen." };
  return { title: "Heute ist dein Tag", emoji: "🎬", sub: "Reels & Videos sind dein Wachstumsmotor. Schneller Content = schnelleres Wachstum = mehr Umsatz. Los geht's." };
}

export default function SocialMediaModelDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [followerSnaps, setFollowerSnaps] = useState<FollowerSnap[]>([]);
  const [postSnaps, setPostSnaps] = useState<PostSnap[]>([]);
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [dayRowsByPlan, setDayRowsByPlan] = useState<Record<string, DayRow[]>>({});
  const [statuses, setStatuses] = useState<Record<string, StatusRow>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [today] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const todayMonday = useMemo(() => mondayOf(today), [today]);

  const statusKey = (aid: string, day: number, idx: number) => `${aid}:${day}:${idx}`;

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const { data: mu } = await supabase
      .from("fanvue_model_users")
      .select("model_id")
      .eq("user_id", user.id);
    const modelIds = (mu || []).map((r: any) => r.model_id);
    if (modelIds.length === 0) {
      setModel(null);
      setPlanRows([]);
      setLoading(false);
      return;
    }

    // Model meta (first one)
    const { data: mdl } = await supabase
      .from("fanvue_models")
      .select("id, name, instagram_url, instagram_urls, platform_logins")
      .in("id", modelIds)
      .limit(1)
      .maybeSingle();
    if (mdl) {
      setModel({
        id: (mdl as any).id,
        name: (mdl as any).name || "",
        instagram_url: (mdl as any).instagram_url || "",
        instagram_urls: Array.isArray((mdl as any).instagram_urls) ? (mdl as any).instagram_urls : [],
        platform_logins: Array.isArray((mdl as any).platform_logins) ? (mdl as any).platform_logins : [],
      });
    }

    // IG follower snapshots
    const { data: fs } = await supabase
      .from("fanvue_instagram_snapshots" as any)
      .select("instagram_url, followers, recorded_at")
      .in("model_id", modelIds)
      .order("recorded_at", { ascending: true });
    setFollowerSnaps(((fs || []) as any[]).map((s) => ({
      instagram_url: s.instagram_url ?? null, followers: s.followers, recorded_at: s.recorded_at,
    })));

    // IG post snapshots — latest per url
    const { data: ps } = await supabase
      .from("fanvue_instagram_post_snapshots" as any)
      .select("instagram_url, posts_7d, posts_30d, last_post_at, recorded_at")
      .in("model_id", modelIds)
      .order("recorded_at", { ascending: false });
    const seen = new Set<string>();
    const latestPosts: PostSnap[] = [];
    ((ps || []) as any[]).forEach((r) => {
      const k = (r.instagram_url || "").toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      latestPosts.push({
        instagram_url: r.instagram_url ?? null,
        posts_7d: r.posts_7d ?? 0,
        posts_30d: r.posts_30d ?? 0,
        last_post_at: r.last_post_at ?? null,
        recorded_at: r.recorded_at,
      });
    });
    setPostSnaps(latestPosts);

    const { data: asgs } = await supabase
      .from("content_plan_assignments")
      .select("id, plan_id, start_date, content_plans(title, description)")
      .in("model_id", modelIds);

    const rows: PlanRow[] = (asgs || []).map((a: any) => ({
      assignment_id: a.id,
      plan_id: a.plan_id,
      plan_title: a.content_plans?.title || "Content Plan",
      plan_description: a.content_plans?.description || "",
      start_date: a.start_date,
    }));
    setPlanRows(rows);

    if (rows.length) {
      const planIds = Array.from(new Set(rows.map((r) => r.plan_id)));
      const { data: dayData } = await supabase
        .from("content_plan_days")
        .select("plan_id, day_number, items")
        .in("plan_id", planIds)
        .order("day_number");
      const byPlan: Record<string, DayRow[]> = {};
      (dayData || []).forEach((d: any) => {
        (byPlan[d.plan_id] ||= []).push({ plan_id: d.plan_id, day_number: d.day_number, items: (d.items as ContentItem[]) || [] });
      });
      setDayRowsByPlan(byPlan);

      const { data: statusData } = await supabase
        .from("content_plan_task_status")
        .select("*")
        .in("assignment_id", rows.map((r) => r.assignment_id));
      const map: Record<string, StatusRow> = {};
      (statusData || []).forEach((s: any) => {
        map[statusKey(s.assignment_id, s.day_number, s.item_index)] = s;
      });
      setStatuses(map);
    } else {
      setDayRowsByPlan({});
      setStatuses({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const handleLogout = async () => {
    await signOut();
    navigate("/socialmedia/login");
  };

  const visibleDaysForAssignment = (startDateISO: string): number[] => {
    const start = mondayOf(new Date(startDateISO));
    if (todayMonday < start) return [];
    const weekOffset = Math.floor(daysBetween(start, todayMonday) / 7);
    const firstDay = weekOffset * 7 + 1;
    const lastDay = firstDay + 6;
    return Array.from({ length: 7 }, (_, i) => firstDay + i).filter((d) => d >= 1 && d <= 30 && d <= lastDay);
  };

  const toggleDone = async (aid: string, day: number, idx: number) => {
    const k = statusKey(aid, day, idx);
    const current = statuses[k];
    const nextDone = !(current?.done ?? false);
    setStatuses((s) => ({
      ...s,
      [k]: {
        ...(current || { assignment_id: aid, day_number: day, item_index: idx, upload_url: "", note: "" }),
        done: nextDone,
      } as StatusRow,
    }));
    const { error, data } = await supabase
      .from("content_plan_task_status")
      .upsert(
        {
          assignment_id: aid,
          day_number: day,
          item_index: idx,
          done: nextDone,
          completed_at: nextDone ? new Date().toISOString() : null,
          upload_url: current?.upload_url ?? "",
          note: current?.note ?? "",
        },
        { onConflict: "assignment_id,day_number,item_index" }
      )
      .select()
      .single();
    if (error) { toast.error("Konnte nicht speichern"); load(); return; }
    setStatuses((s) => ({ ...s, [k]: data as StatusRow }));
  };

  const updateStatusField = async (aid: string, day: number, idx: number, patch: Partial<StatusRow>) => {
    const k = statusKey(aid, day, idx);
    const current = statuses[k];
    setStatuses((s) => ({
      ...s,
      [k]: {
        ...(current || { assignment_id: aid, day_number: day, item_index: idx, done: false, upload_url: "", note: "" }),
        ...patch,
      } as StatusRow,
    }));
    await supabase
      .from("content_plan_task_status")
      .upsert(
        {
          assignment_id: aid,
          day_number: day,
          item_index: idx,
          done: current?.done ?? false,
          upload_url: current?.upload_url ?? "",
          note: current?.note ?? "",
          ...patch,
        },
        { onConflict: "assignment_id,day_number,item_index" }
      );
  };

  // ----- Derived metrics -----
  const totals = useMemo(() => {
    let total = 0, done = 0, weekTotal = 0, weekDone = 0, todayTotal = 0, todayDone = 0;
    planRows.forEach((pr) => {
      const allDays = dayRowsByPlan[pr.plan_id] || [];
      const visible = visibleDaysForAssignment(pr.start_date);
      const start = mondayOf(new Date(pr.start_date));
      allDays.forEach((d) => {
        d.items.forEach((_, idx) => {
          total += 1;
          if (statuses[statusKey(pr.assignment_id, d.day_number, idx)]?.done) done += 1;
        });
      });
      visible.forEach((dn) => {
        const dr = allDays.find((x) => x.day_number === dn);
        const cnt = dr?.items.length || 0;
        weekTotal += cnt;
        for (let i = 0; i < cnt; i++) {
          if (statuses[statusKey(pr.assignment_id, dn, i)]?.done) weekDone += 1;
        }
        const dayDate = new Date(start);
        dayDate.setDate(start.getDate() + (dn - 1));
        if (dayDate.getTime() === today.getTime()) {
          todayTotal += cnt;
          for (let i = 0; i < cnt; i++) {
            if (statuses[statusKey(pr.assignment_id, dn, i)]?.done) todayDone += 1;
          }
        }
      });
    });
    return {
      total, done,
      weekTotal, weekDone,
      todayTotal, todayDone,
      pct: total ? Math.round((done / total) * 100) : 0,
      weekPct: weekTotal ? Math.round((weekDone / weekTotal) * 100) : 0,
    };
  }, [planRows, dayRowsByPlan, statuses, today]);

  // IG growth aggregation across model's IG URLs
  const igStats = useMemo(() => {
    const igUrls = model?.instagram_urls?.length ? model.instagram_urls : (model?.instagram_url ? [model.instagram_url] : []);
    const keys = new Set(igUrls.map(normIg).filter(Boolean));
    const matching = followerSnaps.filter((s) => keys.size === 0 || keys.has(normIg(s.instagram_url)));
    // Group by url-key, take latest + 7-day baseline per key
    const groups: Record<string, FollowerSnap[]> = {};
    matching.forEach((s) => {
      const k = normIg(s.instagram_url) || "_legacy";
      (groups[k] ||= []).push(s);
    });
    let followers = 0, delta7 = 0, baseline = 0;
    Object.values(groups).forEach((snaps) => {
      const sorted = snaps.slice().sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
      const latest = sorted[sorted.length - 1];
      if (!latest) return;
      followers += latest.followers;
      const cutoff = new Date(latest.recorded_at).getTime() - 7 * 86400000;
      let base: FollowerSnap | null = null;
      for (let i = sorted.length - 2; i >= 0; i--) {
        if (new Date(sorted[i].recorded_at).getTime() <= cutoff) { base = sorted[i]; break; }
      }
      if (!base && sorted.length >= 2) base = sorted[0];
      if (base) { baseline += base.followers; delta7 += latest.followers - base.followers; }
    });
    const pct7 = baseline > 0 ? (delta7 / baseline) * 100 : 0;

    const posts7d = postSnaps
      .filter((p) => keys.size === 0 || keys.has(normIg(p.instagram_url)))
      .reduce((a, p) => a + (p.posts_7d || 0), 0);
    const lastPostAt = postSnaps
      .filter((p) => (keys.size === 0 || keys.has(normIg(p.instagram_url))) && p.last_post_at)
      .map((p) => new Date(p.last_post_at!).getTime())
      .reduce((a, b) => Math.max(a, b), 0);

    return { followers, delta7, pct7, posts7d, lastPostAt: lastPostAt || null };
  }, [model, followerSnaps, postSnaps]);

  const greeting = greetingFor(new Date().getHours());
  const firstName = (model?.name || "").split(/\s+/)[0] || "Star";
  const mot = motivationFor(totals.pct, totals.todayDone, totals.todayTotal);

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} kopiert`);
  };

  const TrendIcon = igStats.delta7 > 0 ? TrendingUp : igStats.delta7 < 0 ? TrendingDown : Minus;
  const trendColor = igStats.delta7 > 0 ? "text-emerald-400" : igStats.delta7 < 0 ? "text-red-400" : "text-muted-foreground";
  const lastPostDays = igStats.lastPostAt ? Math.max(0, Math.floor((Date.now() - igStats.lastPostAt) / 86400000)) : null;

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <GoldParticles />
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-accent/20 bg-[linear-gradient(180deg,hsl(0_0%_4%/0.95)_0%,hsl(0_0%_6%/0.85)_100%)] backdrop-blur-2xl">
        <div className="relative z-10 flex items-center gap-3 px-4 py-3.5 md:px-6">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-accent/30 blur-md" aria-hidden="true" />
            <img src={logo} alt="Logo" className="relative h-10 w-10 rounded-full ring-2 ring-accent/50" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold tracking-tight bg-gradient-to-r from-accent via-yellow-200 to-accent bg-clip-text text-transparent">
              Creator Studio
            </h1>
            <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70 font-medium">Dein Daily Hub</p>
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Abmelden</span>
          </Button>
        </div>
      </header>
      <div className="h-[68px]" />

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* HERO: Welcome + Motivation */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-3xl border border-accent/30 p-6 md:p-8"
              style={{
                background: "radial-gradient(120% 140% at 0% 0%, hsl(45 95% 55% / 0.18), transparent 55%), radial-gradient(100% 120% at 100% 100%, hsl(45 95% 55% / 0.10), transparent 50%), linear-gradient(180deg, hsl(0 0% 6% / 0.92), hsl(0 0% 4% / 0.92))",
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
              <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-accent/80 font-semibold mb-2">
                  <Sparkles className="h-3 w-3" />
                  {greeting}
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  Hey <span className="bg-gradient-to-r from-accent via-yellow-100 to-accent bg-clip-text text-transparent">{firstName}</span> 👋
                </h2>
                <p className="mt-3 text-sm md:text-base text-foreground/90 leading-relaxed">
                  <span className="text-xl mr-1">{mot.emoji}</span>
                  <span className="font-semibold">{mot.title}.</span>{" "}
                  <span className="text-muted-foreground">{mot.sub}</span>
                </p>

                {/* Today / Week progress */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <ProgressCard
                    icon={Film}
                    label="Heute"
                    value={`${totals.todayDone}/${totals.todayTotal || 0}`}
                    sub={totals.todayTotal === 0 ? "Frei – nutze die Zeit für extra Content" : totals.todayDone >= totals.todayTotal ? "Alles erledigt 🎉" : "Aufgaben offen"}
                    pct={totals.todayTotal ? (totals.todayDone / totals.todayTotal) * 100 : 0}
                  />
                  <ProgressCard
                    icon={Trophy}
                    label="Diese Woche"
                    value={`${totals.weekDone}/${totals.weekTotal || 0}`}
                    sub={`${totals.weekPct}% geschafft`}
                    pct={totals.weekPct}
                  />
                </div>
              </div>
            </motion.section>

            {/* IG GROWTH STRIP */}
            {(igStats.followers > 0 || igStats.posts7d > 0 || lastPostDays !== null) && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl border border-accent/20 bg-card/40 backdrop-blur-sm p-4 md:p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-accent" />
                    <span className="text-xs uppercase tracking-wider font-semibold text-foreground/90">Dein IG Wachstum</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">letzte 7 Tage</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <StatTile
                    label="Follower"
                    value={igStats.followers > 0 ? igStats.followers.toLocaleString("de-DE") : "–"}
                    accent={
                      igStats.followers > 0 ? (
                        <span className={`flex items-center gap-1 ${trendColor}`}>
                          <TrendIcon className="h-3 w-3" />
                          {igStats.delta7 > 0 ? "+" : ""}{igStats.delta7.toLocaleString("de-DE")}
                          <span className="text-muted-foreground/70">({igStats.pct7 > 0 ? "+" : ""}{igStats.pct7.toFixed(1)}%)</span>
                        </span>
                      ) : <span className="text-muted-foreground">Noch keine Daten</span>
                    }
                  />
                  <StatTile
                    label="Posts / 7T"
                    value={igStats.posts7d.toString()}
                    accent={
                      <span className={igStats.posts7d >= 5 ? "text-emerald-400 flex items-center gap-1" : "text-muted-foreground"}>
                        {igStats.posts7d >= 5 && <Flame className="h-3 w-3" />}
                        {igStats.posts7d >= 7 ? "Top Pace" : igStats.posts7d >= 5 ? "Stark" : igStats.posts7d >= 3 ? "Solide" : "Mehr posten"}
                      </span>
                    }
                  />
                  <StatTile
                    label="Letzter Post"
                    value={lastPostDays === null ? "–" : lastPostDays === 0 ? "Heute" : `vor ${lastPostDays}d`}
                    accent={
                      lastPostDays === null ? <span className="text-muted-foreground">–</span>
                      : lastPostDays <= 1 ? <span className="text-emerald-400">Frisch im Feed</span>
                      : lastPostDays <= 3 ? <span className="text-yellow-400">Bald nachlegen</span>
                      : <span className="text-red-400">Algorithmus schläft ein</span>
                    }
                  />
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground/80 leading-relaxed">
                  <Rocket className="inline h-3 w-3 mr-1 text-accent" />
                  Mehr Reels & Videos = mehr Reach = mehr Subs = mehr Umsatz. Posting-Konsistenz ist dein stärkster Hebel.
                </p>
              </motion.section>
            )}

            {/* PLATFORM LOGINS */}
            {model?.platform_logins && model.platform_logins.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-accent/20 bg-card/40 backdrop-blur-sm p-4 md:p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <KeyRound className="h-4 w-4 text-accent" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-foreground/90">Deine Plattform-Logins</span>
                </div>
                <div className="grid gap-2.5">
                  {model.platform_logins.map((lg, i) => {
                    const showPw = !!revealed[i];
                    return (
                      <div key={i} className="rounded-xl border border-border/40 bg-background/50 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{lg.platform || "Plattform"}</span>
                            {lg.url && (
                              <a href={lg.url.startsWith("http") ? lg.url : `https://${lg.url}`} target="_blank" rel="noopener noreferrer" className="text-accent/80 hover:text-accent">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          {(lg.email || lg.username) && (
                            <button
                              type="button"
                              onClick={() => copyText(lg.email || lg.username || "", "E-Mail")}
                              className="w-full flex items-center justify-between gap-2 text-muted-foreground hover:text-accent transition-colors group"
                            >
                              <span className="truncate">{lg.email || lg.username}</span>
                              <Copy className="h-3 w-3 opacity-50 group-hover:opacity-100 shrink-0" />
                            </button>
                          )}
                          {lg.password && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-foreground/90 truncate flex-1">
                                {showPw ? lg.password : "•".repeat(Math.min(12, lg.password.length))}
                              </span>
                              <button
                                type="button"
                                onClick={() => setRevealed((r) => ({ ...r, [i]: !r[i] }))}
                                className="text-muted-foreground hover:text-accent shrink-0"
                              >
                                {showPw ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyText(lg.password || "", "Passwort")}
                                className="text-muted-foreground hover:text-accent shrink-0"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* CONTENT PLAN (existing functionality, kept) */}
            {planRows.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-border/40 bg-card/30 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aktuell wurde dir noch kein Content Plan zugewiesen.</p>
              </div>
            ) : (
              planRows.map((pr) => {
                const allDays = dayRowsByPlan[pr.plan_id] || [];
                const visible = visibleDaysForAssignment(pr.start_date);
                const start = mondayOf(new Date(pr.start_date));
                const weekIdx = visible.length ? Math.floor((visible[0] - 1) / 7) + 1 : 0;
                const totalItems = allDays.reduce((acc, d) => acc + d.items.length, 0);
                const doneItems = Object.values(statuses).filter((s) => s.assignment_id === pr.assignment_id && s.done).length;
                const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;

                return (
                  <motion.section
                    key={pr.assignment_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-2xl border border-accent/20 bg-card/40 backdrop-blur-sm p-5 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h2 className="font-bold text-foreground">{pr.plan_title}</h2>
                        {pr.plan_description && <p className="text-xs text-muted-foreground mt-0.5">{pr.plan_description}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Gesamt</div>
                        <div className="text-sm font-bold text-accent">{doneItems}/{totalItems}</div>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-background/60 overflow-hidden mb-4">
                      <div className="h-full bg-gradient-to-r from-accent to-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>

                    {visible.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        Dein Plan startet am {start.toLocaleDateString("de-DE")}. Bis dahin gibt's noch nichts zu tun.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-xs uppercase tracking-wider text-accent/80 font-semibold">Woche {weekIdx} · Tage {visible[0]}–{visible[visible.length - 1]}</div>
                        {visible.map((d) => {
                          const dayRow = allDays.find((x) => x.day_number === d);
                          const items = dayRow?.items || [];
                          const dayDate = new Date(start);
                          dayDate.setDate(start.getDate() + (d - 1));
                          const wd = WEEKDAYS_DE[(dayDate.getDay() + 6) % 7];
                          const isToday = dayDate.getTime() === today.getTime();
                          return (
                            <div key={d} className={`rounded-xl border p-3 ${isToday ? "border-accent/50 bg-accent/5" : "border-border/40 bg-background/40"}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-foreground">{wd}, {dayDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span>
                                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Tag {d}</span>
                                  {isToday && <span className="text-[10px] uppercase tracking-wider text-accent font-bold">Heute</span>}
                                </div>
                              </div>
                              {items.length === 0 ? (
                                <p className="text-[11px] text-muted-foreground/60 italic">Frei – kein Content geplant.</p>
                              ) : (
                                <div className="space-y-2">
                                  {items.map((it, idx) => {
                                    const k = statusKey(pr.assignment_id, d, idx);
                                    const st = statuses[k];
                                    const done = !!st?.done;
                                    const legacyUrl = it.title && /^https?:\/\//i.test(it.title) ? it.title : "";
                                    const refUrl = it.reference_url || legacyUrl;
                                    const displayTitle = legacyUrl ? "" : (it.title || "");
                                    return (
                                      <div key={idx} className={`rounded-lg border p-2.5 ${done ? "border-emerald-500/40 bg-emerald-500/5" : "border-accent/20 bg-accent/5"}`}>
                                        <div className="flex items-start gap-2">
                                          <button onClick={() => toggleDone(pr.assignment_id, d, idx)} className="shrink-0 mt-0.5" aria-label="Erledigt">
                                            {done ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Circle className="h-5 w-5 text-muted-foreground hover:text-accent transition-colors" />}
                                          </button>
                                          <LinkIcon className="h-3.5 w-3.5 mt-1 shrink-0 text-accent" />
                                          <div className="flex-1 min-w-0 space-y-1.5">
                                            {displayTitle && (
                                              <div className={`text-sm font-semibold ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{displayTitle}</div>
                                            )}
                                            {refUrl ? (
                                              <a href={refUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline break-all">
                                                <ExternalLink className="h-3 w-3 shrink-0" /> Referenz ansehen
                                              </a>
                                            ) : (!displayTitle && <span className="text-xs italic text-muted-foreground">Kein Inhalt</span>)}
                                            {it.notes && <div className="text-[11px] text-muted-foreground whitespace-pre-wrap">{it.notes}</div>}
                                            <Input
                                              placeholder="Upload-Link (Drive, Notion, ...)"
                                              defaultValue={st?.upload_url || ""}
                                              onBlur={(e) => { const v = e.target.value; if (v !== (st?.upload_url || "")) updateStatusField(pr.assignment_id, d, idx, { upload_url: v }); }}
                                              className="h-7 text-xs bg-background/60"
                                            />
                                            <Textarea
                                              placeholder="Notiz (optional)"
                                              rows={2}
                                              defaultValue={st?.note || ""}
                                              onBlur={(e) => { const v = e.target.value; if (v !== (st?.note || "")) updateStatusField(pr.assignment_id, d, idx, { note: v }); }}
                                              className="text-xs bg-background/60 resize-none"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.section>
                );
              })
            )}

            {/* FAQ */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-accent/20 bg-card/40 backdrop-blur-sm p-4 md:p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="h-4 w-4 text-accent" />
                <span className="text-xs uppercase tracking-wider font-semibold text-foreground/90">FAQ – Häufige Fragen</span>
              </div>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="q1" className="border-border/40">
                  <AccordionTrigger className="text-sm text-left hover:no-underline">
                    Warum sind Reels & Videos so wichtig?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                    Der Instagram-Algorithmus pusht aktuell vor allem Videoformate. Je mehr Reels du regelmäßig postest, desto mehr Reach bekommst du – mehr Reach bedeutet mehr Follower, mehr Sub-Conversions und am Ende direkt mehr Umsatz.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2" className="border-border/40">
                  <AccordionTrigger className="text-sm text-left hover:no-underline">
                    Wie viel Content sollte ich pro Woche liefern?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                    Faustregel: mindestens <span className="text-accent font-semibold">5–7 Reels pro Woche</span>. Wer früher liefert, gewinnt – schneller Content = schneller Wachstum. Halte dich an deinen Content Plan oben und du bist auf der sicheren Seite.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q3" className="border-border/40">
                  <AccordionTrigger className="text-sm text-left hover:no-underline">
                    Wo lade ich meine fertigen Videos hoch?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                    Trage in jedem Task das Upload-Feld mit deinem Drive- oder Notion-Link aus. So sieht dein Marketer sofort, was bereit ist, und kann sofort posten.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q4" className="border-border/40">
                  <AccordionTrigger className="text-sm text-left hover:no-underline">
                    Was wenn mir Ideen fehlen?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                    Jeder Task hat eine Referenz ("Referenz ansehen") – klick rein, schau dir das Beispiel an und produziere es in deinem Style. Du musst nichts neu erfinden, nur konsequent umsetzen.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q5" className="border-border/40">
                  <AccordionTrigger className="text-sm text-left hover:no-underline">
                    Wie erreiche ich mein Team?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                    Schreib deinem zuständigen Marketer direkt auf WhatsApp oder Telegram. Bei dringenden Themen ans Office – Antwort innerhalb von 24h garantiert.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </motion.section>
          </>
        )}
      </main>
    </div>
  );
}

function ProgressCard({ icon: Icon, label, value, sub, pct }: { icon: any; label: string; value: string; sub: string; pct: number }) {
  return (
    <div className="relative rounded-xl border border-accent/20 bg-background/50 p-3 overflow-hidden">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3 text-accent" /> {label}
      </div>
      <div className="mt-1 text-xl font-extrabold text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground/90 truncate">{sub}</div>
      <div className="mt-2 h-1 rounded-full bg-background/80 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-accent to-yellow-400 transition-all" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/50 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg md:text-xl font-extrabold text-foreground tabular-nums">{value}</div>
      <div className="mt-1 text-[10px]">{accent}</div>
    </div>
  );
}
