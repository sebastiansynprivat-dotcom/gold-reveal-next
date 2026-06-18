import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  LogOut, TrendingUp, Sparkles, Instagram, Target, BookOpen, ArrowUpRight,
  Lock, Zap, Flame, ChevronRight,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";
import logo from "@/assets/logo.png";
import GoldParticles from "@/components/GoldParticles";
import TelegramContentChannels from "@/components/TelegramContentChannels";
import PushNotificationDialog from "@/components/PushNotificationDialog";
import NotificationBanner from "@/components/NotificationBanner";
import MarketerDailyRoutine from "@/components/MarketerDailyRoutine";
import { useAppPresence } from "@/hooks/useAppPresence";

type Marketer = { name?: string; instagram?: string; tracking_link?: string; tracking_name?: string };
type ModelRow = {
  id: string;
  name: string;
  username: string;
  marketers?: Marketer[] | null;
  telegram_reels_url?: string | null;
  telegram_backgrounds_url?: string | null;
  telegram_feed_url?: string | null;
};
type Snapshot = { model_id: string; followers: number; recorded_at: string; instagram_url?: string | null };
type PostSnap = { model_id: string; instagram_url: string | null; posts_7d: number; posts_30d: number; posts_total: number; last_post_at: string | null; recorded_at: string };

type IgAccount = {
  modelId: string;
  modelName: string;
  modelUsername: string;
  instagramRaw: string;
  instagramNorm: string;
  href: string;
  label: string;
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function projectFollowers(current: number, perDay: number, days: number): number {
  const safePerDay = Math.max(0, perDay);
  if (current < 1000) {
    const baselineMonthly = 100 + Math.min(400, (current / 1000) * 400);
    const observedMonthly = safePerDay * 30;
    const monthly = Math.max(baselineMonthly, observedMonthly);
    return Math.round(current + (monthly * days) / 30);
  }
  return Math.round(current + safePerDay * days);
}

function normIg(s?: string | null): string {
  if (!s) return "";
  let v = s.trim().toLowerCase();
  v = v.replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
  v = v.replace(/^@/, "");
  v = v.replace(/\/+$/, "");
  v = v.split("?")[0];
  return v;
}


function LockedSection({ children, locked, title, icon: Icon, hint }: {
  children: React.ReactNode;
  locked: boolean;
  title: string;
  icon: React.ElementType;
  hint?: string;
}) {
  return (
    <section className={`relative ${locked ? "opacity-50 pointer-events-none select-none" : ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-accent" />
        <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-bold">{title}</h2>
        {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
      </div>
      {children}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 via-card/50 to-background/40 backdrop-blur-sm p-6 text-center shadow-xl">
            <Lock className="h-8 w-8 text-accent mx-auto mb-3" />
            <p className="text-sm font-bold text-foreground">{hint || "Schließe zuerst das Coaching ab."}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default function MarketerDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [snapshotsByKey, setSnapshotsByKey] = useState<Record<string, Snapshot[]>>({});
  const [postsByKey, setPostsByKey] = useState<Record<string, PostSnap>>({});
  const [marketerName, setMarketerName] = useState<string>("");
  const [coachingComplete, setCoachingComplete] = useState<boolean | null>(null);
  const [coachingCompletedAt, setCoachingCompletedAt] = useState<Date | null>(null);

  useAppPresence("marketer");

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);

      const { data: prof } = await supabase
        .from("admin_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const mName = ((prof as any)?.display_name || "").trim();
      setMarketerName(mName);

      // Load coaching completion status
      const { data: progress } = await supabase
        .from("marketer_coaching_progress")
        .select("lesson_id,completed_at")
        .eq("user_id", user.id);
      const rows = (progress || []) as any[];
      const completedLessons = new Set(rows.map((r) => r.lesson_id));
      const totalLessons = 20; // sync with MarketerCoaching.tsx ALL_LESSON_IDS count
      const isComplete = completedLessons.size >= totalLessons;
      setCoachingComplete(isComplete);
      if (isComplete && rows.length > 0) {
        const latest = rows
          .map((r) => (r.completed_at ? new Date(r.completed_at).getTime() : 0))
          .reduce((a, b) => Math.max(a, b), 0);
        setCoachingCompletedAt(latest > 0 ? new Date(latest) : new Date());
      } else {
        setCoachingCompletedAt(null);
      }

      const { data: asg } = await supabase
        .from("marketer_model_assignments")
        .select("model_id")
        .eq("marketer_user_id", user.id);
      const ids = (asg || []).map((a: any) => a.model_id);
      if (ids.length === 0) {
        setModels([]); setLoading(false); return;
      }
      const { data: mdls } = await supabase
        .from("fanvue_models")
        .select("id,name,username,marketers,telegram_reels_url,telegram_backgrounds_url,telegram_feed_url")
        .in("id", ids);
      const since = daysAgo(60).toISOString();
      const { data: snaps } = await supabase
        .from("fanvue_instagram_snapshots")
        .select("model_id,followers,recorded_at,instagram_url")
        .in("model_id", ids)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true });
      const grouped: Record<string, Snapshot[]> = {};
      (snaps || []).forEach((s: any) => {
        const key = `${s.model_id}|${normIg(s.instagram_url)}`;
        (grouped[key] ||= []).push(s);
      });

      const { data: psnaps } = await supabase
        .from("fanvue_instagram_post_snapshots" as any)
        .select("model_id,instagram_url,posts_7d,posts_30d,posts_total,last_post_at,recorded_at")
        .in("model_id", ids)
        .order("recorded_at", { ascending: false });
      const pmap: Record<string, PostSnap> = {};
      (psnaps || []).forEach((p: any) => {
        const key = `${p.model_id}|${normIg(p.instagram_url)}`;
        if (!pmap[key]) pmap[key] = p as PostSnap;
      });
      setPostsByKey(pmap);

      setModels((mdls as ModelRow[]) || []);
      setSnapshotsByKey(grouped);
      setLoading(false);
    })();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/marketer/login");
  };

  const igAccounts = useMemo<IgAccount[]>(() => {
    if (!marketerName) return [];
    const norm = (s?: string | null) => (s || "").trim().toLowerCase();
    const out: IgAccount[] = [];
    models.forEach(m => {
      (m.marketers || []).forEach(mk => {
        if (!mk?.instagram) return;
        if (norm(mk.name) !== norm(marketerName)) return;
        const raw = mk.instagram.trim();
        const href = raw.startsWith("http") ? raw : `https://instagram.com/${raw.replace(/^@/, "")}`;
        const label = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "");
        out.push({
          modelId: m.id,
          modelName: m.name,
          modelUsername: m.username,
          instagramRaw: raw,
          instagramNorm: normIg(raw),
          href,
          label: label.startsWith("@") ? label : `@${label}`,
        });
      });
    });
    return out;
  }, [models, marketerName]);

  const computeMetrics = (snaps: Snapshot[]) => {
    if (!snaps.length) return null;
    const last = snaps[snaps.length - 1];
    const findClosest = (target: Date) => {
      let best: Snapshot | null = null;
      let bestDiff = Infinity;
      for (const s of snaps) {
        const diff = Math.abs(new Date(s.recorded_at).getTime() - target.getTime());
        if (diff < bestDiff) { bestDiff = diff; best = s; }
      }
      return best;
    };
    const s7 = findClosest(daysAgo(7));
    const s30 = findClosest(daysAgo(30));
    const growth7 = s7 ? last.followers - s7.followers : 0;
    const growth30 = s30 ? last.followers - s30.followers : 0;

    const recent = snaps.filter(s => new Date(s.recorded_at) >= daysAgo(30));
    let perDay = 0;
    if (recent.length >= 2) {
      const first = recent[0];
      const days = Math.max(1, (new Date(last.recorded_at).getTime() - new Date(first.recorded_at).getTime()) / 86400000);
      perDay = (last.followers - first.followers) / days;
    }
    return {
      current: last.followers,
      growth7,
      growth30,
      perDay,
      forecast30: projectFollowers(last.followers, perDay, 30),
      forecast60: projectFollowers(last.followers, perDay, 60),
      forecast90: projectFollowers(last.followers, perDay, 90),
    };
  };

  const snapsFor = (a: IgAccount) => snapshotsByKey[`${a.modelId}|${a.instagramNorm}`] || [];
  const postFor = (a: IgAccount) => postsByKey[`${a.modelId}|${a.instagramNorm}`] || null;

  const totalForecast30 = useMemo(() => {
    let sum = 0;
    igAccounts.forEach(a => {
      const metrics = computeMetrics(snapsFor(a));
      if (metrics) sum += metrics.forecast30 - metrics.current;
    });
    return sum;
  }, [igAccounts, snapshotsByKey]);

  const locked = coachingComplete === false;
  const showLockedHint = coachingComplete === false;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <GoldParticles />
      <PushNotificationDialog />
      <NotificationBanner />
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-accent/20 bg-[linear-gradient(180deg,hsl(0_0%_4%/0.95)_0%,hsl(0_0%_6%/0.85)_100%)] backdrop-blur-2xl">
        <div className="relative z-10 flex items-center gap-3 px-4 py-3.5 md:px-6">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-accent/30 blur-md" aria-hidden="true" />
            <img src={logo} alt="Logo" className="relative h-10 w-10 rounded-full ring-2 ring-accent/50" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold tracking-tight bg-gradient-to-r from-accent via-yellow-200 to-accent bg-clip-text text-transparent">
              Marketer Dashboard
            </h1>
            <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70 font-medium">
              {igAccounts.length} {igAccounts.length === 1 ? "Account" : "Accounts"} betreut
            </p>
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <div className="h-[68px]" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-8">

        {/* Coaching CTA — always first */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-accent" />
            <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-bold">Coaching</h2>
          </div>
          <button
            onClick={() => navigate("/marketer/coaching")}
            className="group w-full text-left relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 via-card/50 to-background/40 backdrop-blur-sm p-6 hover:border-accent/60 transition-all"
          >
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-accent/15 blur-3xl pointer-events-none group-hover:bg-accent/25 transition-colors" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
            <div className="relative flex items-start gap-4 flex-wrap">
              <div className="h-12 w-12 rounded-xl border border-accent/40 bg-background/60 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.3em] text-accent/80 font-bold">SheX Marketer Academy</div>
                <h3 className="text-xl font-extrabold text-foreground mt-1 leading-tight">Vom Onboarding zur Skalierung.</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
                  Interaktives Coaching: Aufwärmprozess, Postingzeiten, Branding, Werbung, Skalierung – Schritt für Schritt mit Fortschrittstracking und täglicher Routine-Checkliste.
                </p>
                {showLockedHint && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent/10 border border-accent/20 px-3 py-2 text-xs text-accent font-bold">
                    <Lock className="h-3.5 w-3.5" />
                    Hier erst mal das Coaching abschließen und dann geht es weiter.
                  </div>
                )}
                <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-accent group-hover:gap-2.5 transition-all">
                  {coachingComplete ? "Coaching öffnen" : "Jetzt starten"} <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </button>
        </section>

        {/* Locked feature preview: Forecast */}
        <LockedSection locked={locked} title="Prognose" icon={Target} hint="Abschluss des Coachings erforderlich.">
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 via-accent/5 to-transparent p-6 backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-accent/80 font-bold mb-1">Prognose · 30 Tage</p>
                <p className="text-3xl md:text-4xl font-bold text-foreground tabular-nums">
                  {totalForecast30 >= 0 ? "+" : ""}{totalForecast30.toLocaleString("de-DE")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">erwartetes Follower-Wachstum über deine Accounts</p>
              </div>
              <Sparkles className="h-10 w-10 text-accent/60" />
            </div>
          </motion.div>
        </LockedSection>

        {/* Locked feature preview: Instagram Accounts */}
        <LockedSection locked={locked} title="Meine Instagram-Accounts" icon={Instagram} hint="Abschluss des Coachings erforderlich.">
          {igAccounts.length === 0 ? (
            <div className="rounded-2xl border border-border/40 bg-card/40 p-10 text-center text-muted-foreground">
              <Instagram className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Dir sind noch keine Instagram-Accounts zugewiesen.</p>
              <p className="text-xs mt-1">Wende dich an dein Admin-Team.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {igAccounts.map((a, idx) => {
                const snaps = snapsFor(a);
                const metrics = computeMetrics(snaps);
                const post = postFor(a);
                const chartData = snaps.map(s => ({
                  date: new Date(s.recorded_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
                  followers: s.followers,
                }));
                const key = `${a.modelId}-${a.instagramNorm}-${idx}`;
                return (
                  <motion.div
                    key={key} layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-accent/15 bg-card/40 backdrop-blur-sm p-5 relative overflow-hidden hover:border-accent/40 transition-all"
                  >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="min-w-0">
                        <a href={a.href} target="_blank" rel="noopener noreferrer"
                          className="font-bold text-foreground truncate hover:text-accent transition-colors block">
                          {a.label}
                        </a>
                        <p className="text-xs text-muted-foreground truncate">für {a.modelName}</p>
                      </div>
                      <Instagram className="h-4 w-4 text-accent/70 shrink-0" />
                    </div>
                    {metrics ? (
                      <>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-2xl font-bold text-foreground tabular-nums">{metrics.current.toLocaleString("de-DE")}</span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Follower</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="rounded-lg bg-background/40 px-2 py-1.5">
                            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">7d</p>
                            <p className={`text-sm font-bold tabular-nums ${metrics.growth7 >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                              {metrics.growth7 >= 0 ? "+" : ""}{metrics.growth7.toLocaleString("de-DE")}
                            </p>
                          </div>
                          <div className="rounded-lg bg-background/40 px-2 py-1.5">
                            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">30d</p>
                            <p className={`text-sm font-bold tabular-nums ${metrics.growth30 >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                              {metrics.growth30 >= 0 ? "+" : ""}{metrics.growth30.toLocaleString("de-DE")}
                            </p>
                          </div>
                          <div className="rounded-lg bg-background/40 px-2 py-1.5">
                            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Posts 7d</p>
                            <p className="text-sm font-bold tabular-nums text-accent">
                              {post ? post.posts_7d : "—"}
                            </p>
                          </div>
                        </div>
                        {post?.last_post_at && (
                          <p className="text-[10px] text-muted-foreground -mt-2 mb-2">
                            Letzter Post: vor {Math.max(0, Math.floor((Date.now() - new Date(post.last_post_at).getTime()) / 86400000))}d
                            <span className="text-muted-foreground/60"> · {post.posts_30d} Posts / 30d</span>
                          </p>
                        )}
                        {chartData.length >= 2 && (
                          <div className="h-16 -mx-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData}>
                                <defs>
                                  <linearGradient id={`g-${key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.6} />
                                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <Tooltip
                                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--accent) / 0.3)", borderRadius: 8, fontSize: 11 }}
                                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                                />
                                <Area type="monotone" dataKey="followers" stroke="hsl(var(--accent))" fill={`url(#g-${key})`} strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Prognose 30d</span>
                          <span className="text-accent font-bold tabular-nums inline-flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" />
                            {metrics.forecast30.toLocaleString("de-DE")}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">Noch keine Instagram-Daten erfasst.</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </LockedSection>

        {/* Locked feature preview: Forecasts detail table */}
        {igAccounts.length > 0 && (
          <LockedSection locked={locked} title="Prognosen" icon={TrendingUp} hint="Abschluss des Coachings erforderlich.">
            <div className="rounded-2xl border border-accent/15 bg-card/40 backdrop-blur-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-background/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Account</th>
                    <th className="px-4 py-2.5 text-left">Model</th>
                    <th className="px-4 py-2.5 text-right">Jetzt</th>
                    <th className="px-4 py-2.5 text-right">+30d</th>
                    <th className="px-4 py-2.5 text-right">+60d</th>
                    <th className="px-4 py-2.5 text-right">+90d</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {igAccounts.map((a, idx) => {
                    const metrics = computeMetrics(snapsFor(a));
                    return (
                      <tr key={`${a.modelId}-${a.instagramNorm}-${idx}`} className="hover:bg-accent/5 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-foreground">{a.label}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{a.modelName}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {metrics?.current.toLocaleString("de-DE") ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-accent font-semibold">
                          {metrics?.forecast30.toLocaleString("de-DE") ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-accent font-semibold">
                          {metrics?.forecast60.toLocaleString("de-DE") ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-accent font-semibold">
                          {metrics?.forecast90.toLocaleString("de-DE") ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-2">
              Adaptive Prognose: neue Accounts (&lt; 1.000 Follower) starten mit 100–500 erwartetem Wachstum / Monat; ab 1.000 Followern auf Basis des gemessenen Trends der letzten 30 Tage. Werte können abweichen.
            </p>
          </LockedSection>
        )}

        {/* Dynamische Tagesroutine – nur sichtbar nach abgeschlossenem Coaching */}
        {coachingComplete && user?.id && (
          <MarketerDailyRoutine userId={user.id} coachingCompletedAt={coachingCompletedAt} />
        )}

        {/* Telegram Content-Kanäle pro Model — always visible */}
        {models.map((m) => {
          const hasAny =
            (m.telegram_reels_url || "").trim() ||
            (m.telegram_backgrounds_url || "").trim() ||
            (m.telegram_feed_url || "").trim();
          if (!hasAny) return null;
          return (
            <TelegramContentChannels
              key={`tg-${m.id}`}
              title={`Content-Kanäle · ${m.name}`}
              subtitle="Direkt zu den Telegram-Kanälen mit dem aktuellen Content für dieses Model."
              reelsUrl={m.telegram_reels_url}
              backgroundsUrl={m.telegram_backgrounds_url}
              feedUrl={m.telegram_feed_url}
            />
          );
        })}

      </main>
    </div>
  );
}
