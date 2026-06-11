import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  LogOut, TrendingUp, Users, Sparkles, Instagram, Target, BookOpen, ArrowUpRight,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";
import logo from "@/assets/logo.png";
import GoldParticles from "@/components/GoldParticles";

type Marketer = { name?: string; instagram?: string; tracking_link?: string; tracking_name?: string };
type ModelRow = { id: string; name: string; username: string; marketers?: Marketer[] | null };
type Snapshot = { model_id: string; followers: number; recorded_at: string; instagram_url?: string | null };

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export default function MarketerDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [snapshotsByModel, setSnapshotsByModel] = useState<Record<string, Snapshot[]>>({});
  const [marketerName, setMarketerName] = useState<string>("");

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);

      // Load own display name to match marketer entries on models
      const { data: prof } = await supabase
        .from("admin_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setMarketerName(((prof as any)?.display_name || "").trim());

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
        .select("id,name,username,marketers")
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
        (grouped[s.model_id] ||= []).push(s);
      });
      setModels((mdls as ModelRow[]) || []);
      setSnapshotsByModel(grouped);
      setLoading(false);
    })();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/marketer/login");
  };

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

    // Linear forecast from last 30 days
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
      forecast30: Math.round(last.followers + perDay * 30),
      forecast60: Math.round(last.followers + perDay * 60),
      forecast90: Math.round(last.followers + perDay * 90),
    };
  };

  const totalForecast30 = useMemo(() => {
    let sum = 0;
    models.forEach(m => {
      const metrics = computeMetrics(snapshotsByModel[m.id] || []);
      if (metrics) sum += metrics.forecast30 - metrics.current;
    });
    return sum;
  }, [models, snapshotsByModel]);

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
              {models.length} {models.length === 1 ? "Model" : "Models"} betreut
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
        {/* Hero summary */}
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
              <p className="text-sm text-muted-foreground mt-1">erwartetes Follower-Wachstum über alle Models</p>
            </div>
            <Sparkles className="h-10 w-10 text-accent/60" />
          </div>
        </motion.div>

        {/* My Models */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-accent" />
            <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-bold">Meine Models</h2>
          </div>
          {models.length === 0 ? (
            <div className="rounded-2xl border border-border/40 bg-card/40 p-10 text-center text-muted-foreground">
              <Instagram className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Dir wurden noch keine Models zugewiesen.</p>
              <p className="text-xs mt-1">Wende dich an dein Admin-Team.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map(m => {
                const snaps = snapshotsByModel[m.id] || [];
                const metrics = computeMetrics(snaps);
                const chartData = snaps.map(s => ({
                  date: new Date(s.recorded_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
                  followers: s.followers,
                }));
                return (
                  <motion.div
                    key={m.id} layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-accent/15 bg-card/40 backdrop-blur-sm p-5 relative overflow-hidden hover:border-accent/40 transition-all"
                  >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground truncate">{m.name}</h3>
                        {m.username && <p className="text-xs text-muted-foreground truncate">@{m.username}</p>}
                      </div>
                      <Instagram className="h-4 w-4 text-accent/70 shrink-0" />
                    </div>
                    {metrics ? (
                      <>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-2xl font-bold text-foreground tabular-nums">{metrics.current.toLocaleString("de-DE")}</span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Follower</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
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
                        </div>
                        {chartData.length >= 2 && (
                          <div className="h-16 -mx-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData}>
                                <defs>
                                  <linearGradient id={`g-${m.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.6} />
                                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <Tooltip
                                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--accent) / 0.3)", borderRadius: 8, fontSize: 11 }}
                                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                                />
                                <Area type="monotone" dataKey="followers" stroke="hsl(var(--accent))" fill={`url(#g-${m.id})`} strokeWidth={2} />
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
        </section>

        {/* Forecasts detail */}
        {models.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-accent" />
              <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-bold">Prognosen</h2>
            </div>
            <div className="rounded-2xl border border-accent/15 bg-card/40 backdrop-blur-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-background/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Model</th>
                    <th className="px-4 py-2.5 text-right">Jetzt</th>
                    <th className="px-4 py-2.5 text-right">+30d</th>
                    <th className="px-4 py-2.5 text-right">+60d</th>
                    <th className="px-4 py-2.5 text-right">+90d</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {models.map(m => {
                    const metrics = computeMetrics(snapshotsByModel[m.id] || []);
                    return (
                      <tr key={m.id} className="hover:bg-accent/5 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-foreground">{m.name}</td>
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
              Lineare Trendprognose auf Basis der letzten 30 Tage. Tatsächliche Werte können abweichen.
            </p>
          </section>
        )}

        {/* Coaching */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-accent" />
            <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-bold">Coaching</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Grundlagen Instagram Growth", desc: "Hook, Hold, Conversion — was wirklich zählt." },
              { title: "Reel-Skripte die viral gehen", desc: "Bewährte Strukturen für deine Models." },
              { title: "Wöchentliche Performance-Reviews", desc: "So lieferst du klare Insights ans Model." },
            ].map((c, i) => (
              <div key={i} className="rounded-2xl border border-accent/15 bg-card/40 backdrop-blur-sm p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                <TrendingUp className="h-5 w-5 text-accent mb-3" />
                <h3 className="font-bold text-foreground mb-1">{c.title}</h3>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
                <p className="text-[10px] uppercase tracking-wider text-accent/70 mt-3">Bald verfügbar</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
