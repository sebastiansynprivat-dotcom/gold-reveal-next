import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Flame, Zap, Sparkles, Rocket, TrendingUp } from "lucide-react";
import { toast } from "sonner";

type Props = {
  userId: string;
  coachingCompletedAt: Date | null; // null => not yet completed
};

type DailyTask = { key: string; icon: string; label: string };

type PhaseInfo = {
  phaseId: "warmup" | "routine" | "scale";
  phaseLabel: string;
  phaseSubtitle: string;
  tasks: DailyTask[];
  badge: string;
  badgeClass: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

function daysSince(date: Date): number {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - start.getTime()) / 86400000) + 1; // Tag 1 = Starttag
}

function getPhase(day: number): PhaseInfo {
  // Aufwärmphase (Tag 1–7)
  if (day === 1) return {
    phaseId: "warmup",
    phaseLabel: "Aufwärmphase · Tag 1",
    phaseSubtitle: "Account vorbereiten – Setup als echter Mensch.",
    badge: "Warm-up", badgeClass: "border-orange-400/40 bg-orange-500/15 text-orange-300",
    tasks: [
      { key: "w1-sim", icon: "📱", label: "IG mit eigener Nummer & nur mit mobilen Daten neu einrichten (kein WLAN)" },
      { key: "w1-typing", icon: "⌨️", label: "Mit normaler Tippgeschwindigkeit anmelden – kein Copy-Paste" },
      { key: "w1-notif", icon: "🔔", label: "Alle Benachrichtigungen aktivieren (vor allem Push)" },
      { key: "w1-name", icon: "🪪", label: "Authentischen Benutzernamen wählen (z. B. emma.kfm)" },
      { key: "w1-pic", icon: "🖼️", label: "Sympathisches Profilbild – nicht zu viel Haut" },
      { key: "w1-bio", icon: "📝", label: "Bio hinzufügen (nicht sexuell)" },
      { key: "w1-reels", icon: "📺", label: "10–15 Min. Reels schauen, App schließen, 24 h Pause" },
    ],
  };
  if (day === 2) return {
    phaseId: "warmup",
    phaseLabel: "Aufwärmphase · Tag 2",
    phaseSubtitle: "Erste Aktivität – Verhalten wie ein echter User.",
    badge: "Warm-up", badgeClass: "border-orange-400/40 bg-orange-500/15 text-orange-300",
    tasks: [
      { key: "w2-scroll", icon: "📲", label: "Ca. 30 Min. durch Feed & Reels scrollen" },
      { key: "w2-likes", icon: "❤️", label: "5–10 Likes auf verschiedenen Seiten" },
      { key: "w2-story", icon: "📸", label: "1 Story posten (normales Bild, wenig Haut)" },
      { key: "w2-image", icon: "🖼️", label: "1 Bild posten (normales Bild, wenig Haut)" },
      { key: "w2-follow", icon: "👥", label: "5–10 Models folgen – langsam, nicht alle auf einmal" },
    ],
  };
  if (day === 3) return {
    phaseId: "warmup",
    phaseLabel: "Aufwärmphase · Tag 3",
    phaseSubtitle: "Erste Interaktionen – ruhig bleiben, kein Spam.",
    badge: "Warm-up", badgeClass: "border-orange-400/40 bg-orange-500/15 text-orange-300",
    tasks: [
      { key: "w3-scroll", icon: "📲", label: "15–30 Min. Scrollzeit" },
      { key: "w3-likes", icon: "❤️", label: "3–5 Likes auf Beiträge, die dich interessieren" },
      { key: "w3-image", icon: "🖼️", label: "1 Bild posten (normales Bild, wenig Haut)" },
      { key: "w3-creator", icon: "🎛️", label: "Auf Creator-Profil wechseln" },
    ],
  };
  if (day === 4) return {
    phaseId: "warmup",
    phaseLabel: "Aufwärmphase · Tag 4",
    phaseSubtitle: "Routine festigen – realistische Zeitspannen.",
    badge: "Warm-up", badgeClass: "border-orange-400/40 bg-orange-500/15 text-orange-300",
    tasks: [
      { key: "w4-time", icon: "⏱️", label: "Ca. 30 Min. auf Instagram" },
      { key: "w4-reels", icon: "📺", label: "Reels schauen, 2–3 Creator liken & folgen" },
      { key: "w4-story", icon: "📸", label: "1 weitere Story posten (normales Bild, wenig Haut)" },
    ],
  };
  if (day === 5 || day === 6) return {
    phaseId: "warmup",
    phaseLabel: `Aufwärmphase · Tag ${day}`,
    phaseSubtitle: "Realistisch bleiben – 1 Like alle 3–5 Min.",
    badge: "Warm-up", badgeClass: "border-orange-400/40 bg-orange-500/15 text-orange-300",
    tasks: [
      { key: "w56-time", icon: "⏱️", label: "Ca. 30 Min. auf Instagram" },
      { key: "w56-rhythm", icon: "❤️", label: "1 Like alle 3–5 Min. – ganz natürlich" },
      { key: "w56-follow", icon: "👥", label: "2–3 Creator liken/folgen" },
      { key: "w56-story", icon: "📸", label: "1 weitere Story posten (normales Bild, wenig Haut)" },
    ],
  };
  if (day === 7) return {
    phaseId: "warmup",
    phaseLabel: "Aufwärmphase · Tag 7",
    phaseSubtitle: "Erstes Reel – ab jetzt täglich Content.",
    badge: "Warm-up", badgeClass: "border-orange-400/40 bg-orange-500/15 text-orange-300",
    tasks: [
      { key: "w7-reel", icon: "🎬", label: "Erstes Reel posten – clean: Alltagsoutfit (Jeans, Shirt, Pulli)" },
      { key: "w7-story", icon: "📸", label: "1 Story posten" },
      { key: "w7-interact", icon: "💬", label: "Reels ansehen & liken (wie privat)" },
    ],
  };

  // Routine-Phase (Tag 8 – 35) → 1–2 Reels/Tag, immer gleiche Zeit
  if (day <= 35) {
    const week = Math.floor((day - 8) / 7) + 1; // 1..4
    return {
      phaseId: "routine",
      phaseLabel: `Routine-Phase · Tag ${day}`,
      phaseSubtitle: `Woche ${week}/4 · 1–2 qualitative Reels/Tag, immer zur gleichen Zeit.`,
      badge: "Routine", badgeClass: "border-yellow-400/40 bg-yellow-500/15 text-yellow-300",
      tasks: [
        { key: "r-interact", icon: "💬", label: "5–10 Reels ansehen, liken & kommentieren (wie privat)" },
        { key: "r-reel1", icon: "🎬", label: "Reel #1 posten – immer gleiche Zeit (z. B. 18 Uhr)" },
        { key: "r-reel2", icon: "🎬", label: "Optional: Reel #2 posten (08–10 oder 12–14 Uhr)" },
        { key: "r-story", icon: "📸", label: "Mindestens 1 Story posten" },
        { key: "r-feed", icon: "🖼️", label: "Feed-Bild prüfen / heute posten (jeden 2. Tag)" },
        { key: "r-ad", icon: "📣", label: "Ab 500 Followern: alle 2 Tage Werbe-Story" },
        { key: "r-review", icon: "📊", label: "Performance vom Vortag kurz prüfen" },
      ],
    };
  }

  // Skalierungsphase (Tag 36+) → 3 Reels/Tag
  return {
    phaseId: "scale",
    phaseLabel: `Skalierungsphase · Tag ${day}`,
    phaseSubtitle: "Account ist warm · 3 Reels/Tag · neuer Account ab Tag 14 möglich.",
    badge: "Skalierung", badgeClass: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300",
    tasks: [
      { key: "s-interact", icon: "💬", label: "5–10 Reels ansehen, liken & kommentieren" },
      { key: "s-reel1", icon: "🎬", label: "Reel #1 posten (08–10 Uhr)" },
      { key: "s-reel2", icon: "🎬", label: "Reel #2 posten (12–14 Uhr)" },
      { key: "s-reel3", icon: "🎬", label: "Reel #3 posten (18–20 Uhr Primetime)" },
      { key: "s-story", icon: "📸", label: "Mehrere Storys über den Tag verteilt" },
      { key: "s-feed", icon: "🖼️", label: "Feed-Bild prüfen / heute posten (jeden 2. Tag)" },
      { key: "s-ad", icon: "📣", label: "Alle 2 Tage Werbe-Story (Storys + Link in Bio)" },
      { key: "s-review", icon: "📊", label: "Performance prüfen & nächsten Account planen" },
    ],
  };
}

export default function MarketerDailyRoutine({ userId, coachingCompletedAt }: Props) {
  const [dailyDone, setDailyDone] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const day = coachingCompletedAt ? Math.max(1, daysSince(coachingCompletedAt)) : 1;
  const phase = useMemo(() => getPhase(day), [day]);
  const totalTasks = phase.tasks.length;

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const sinceISO = since.toISOString().slice(0, 10);
      const [tasksRes, historyRes] = await Promise.all([
        supabase.from("marketer_daily_tasks").select("task_key,done").eq("user_id", userId).eq("task_date", todayISO()),
        supabase.from("marketer_daily_tasks").select("task_date,done").eq("user_id", userId).gte("task_date", sinceISO),
      ]);
      setDailyDone(new Set((tasksRes.data || []).filter((r: any) => r.done).map((r: any) => r.task_key)));
      const counts: Record<string, number> = {};
      (historyRes.data || []).forEach((r: any) => {
        if (!r.done) return;
        counts[r.task_date] = (counts[r.task_date] || 0) + 1;
      });
      setHistory(counts);
      setLoading(false);
    })();
  }, [userId]);

  const toggleTask = async (key: string) => {
    if (!userId) return;
    const wasDone = dailyDone.has(key);
    const next = new Set(dailyDone);
    if (wasDone) next.delete(key); else next.add(key);
    setDailyDone(next);
    const t = todayISO();
    setHistory((h) => ({ ...h, [t]: next.size }));
    await supabase.from("marketer_daily_tasks").upsert(
      { user_id: userId, task_date: t, task_key: key, done: !wasDone },
      { onConflict: "user_id,task_date,task_key" }
    );
    if (!wasDone && next.size === totalTasks) {
      toast.success("🔥 Heute alles erledigt – stark!");
    }
  };

  const donePct = totalTasks === 0 ? 0 : Math.round((dailyDone.size / totalTasks) * 100);

  // Streak = consecutive days (ending today/yesterday) with ≥ targetForThatDay tasks done.
  // We don't know historic targets, so we use "≥ 3 Aufgaben" as Streak-Schwelle.
  const { currentStreak, bestStreak, perfectDays } = useMemo(() => {
    const STREAK_THRESHOLD = 3;
    const ok = new Set(Object.entries(history).filter(([, c]) => c >= STREAK_THRESHOLD).map(([d]) => d));
    const start = new Date(); start.setHours(0, 0, 0, 0);
    let cur = 0;
    if (!ok.has(start.toISOString().slice(0, 10))) {
      start.setDate(start.getDate() - 1);
    }
    while (ok.has(start.toISOString().slice(0, 10))) {
      cur += 1;
      start.setDate(start.getDate() - 1);
    }
    const sorted = [...ok].sort();
    let best = 0, run = 0;
    let prev: Date | null = null;
    for (const d of sorted) {
      const cd = new Date(d + "T00:00:00");
      if (prev && (cd.getTime() - prev.getTime()) === 86400000) run += 1; else run = 1;
      if (run > best) best = run;
      prev = cd;
    }
    return { currentStreak: cur, bestStreak: Math.max(best, cur), perfectDays: ok.size };
  }, [history]);

  const Icon = phase.phaseId === "warmup" ? Sparkles : phase.phaseId === "routine" ? Rocket : TrendingUp;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-accent" />
        <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-bold">Tagesroutine</h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-accent/20 bg-card/40 backdrop-blur-sm p-5 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

        {/* Phase header */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-12 w-12 rounded-xl border border-accent/30 bg-background/60 flex items-center justify-center shrink-0">
              <Icon className="h-6 w-6 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${phase.badgeClass}`}>
                  {phase.badge}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  basiert auf deinem Coaching-Fortschritt
                </span>
              </div>
              <h3 className="text-base md:text-lg font-extrabold text-foreground mt-1 leading-tight">{phase.phaseLabel}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{phase.phaseSubtitle}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Heute</div>
            <div className="text-base font-bold text-accent tabular-nums">{dailyDone.size}/{totalTasks}</div>
            <div className="mt-1 w-24 h-1.5 rounded-full bg-background/60 overflow-hidden ml-auto">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-accent transition-all" style={{ width: `${donePct}%` }} />
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className={`mb-4 rounded-2xl border p-3 flex items-center gap-3 ${
          currentStreak >= 3
            ? "border-orange-500/40 bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-accent/10"
            : "border-border/40 bg-background/40"
        }`}>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
            currentStreak >= 3
              ? "bg-gradient-to-br from-orange-500/30 to-amber-400/20 border border-orange-400/40 shadow-[0_0_16px_rgba(251,146,60,0.35)]"
              : "bg-background/60 border border-border/50"
          }`}>
            <Flame className={`h-5 w-5 ${currentStreak >= 3 ? "text-orange-400" : currentStreak >= 1 ? "text-accent" : "text-muted-foreground/60"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className={`text-2xl font-extrabold tabular-nums leading-none ${currentStreak >= 3 ? "text-orange-300" : "text-foreground"}`}>
                {currentStreak}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                {currentStreak === 1 ? "Tag Streak" : "Tage Streak"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {currentStreak === 0
                ? "Hak heute deine Aufgaben ab und starte deinen Streak."
                : dailyDone.size === totalTasks
                ? "Heute komplett – stark! Morgen weiter dranbleiben."
                : `Noch ${totalTasks - dailyDone.size} ${totalTasks - dailyDone.size === 1 ? "Aufgabe" : "Aufgaben"} für heute.`}
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Best · 90d</div>
            <div className="text-sm font-bold text-accent tabular-nums">{bestStreak} {bestStreak === 1 ? "Tag" : "Tage"}</div>
            <div className="text-[10px] text-muted-foreground">{perfectDays} aktive Tage</div>
          </div>
        </div>

        {/* Tasks */}
        {loading ? (
          <div className="py-6 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid gap-2">
            {phase.tasks.map((t) => {
              const done = dailyDone.has(t.key);
              return (
                <button
                  key={t.key}
                  onClick={() => toggleTask(t.key)}
                  className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    done
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-border/40 bg-background/40 hover:border-accent/40 hover:bg-accent/5"
                  }`}
                >
                  <span className="text-xl shrink-0">{t.icon}</span>
                  <span className={`flex-1 text-sm leading-snug ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {t.label}
                  </span>
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground group-hover:text-accent shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/80 italic mt-3">
          Reset um Mitternacht. Aufgaben passen sich automatisch an deine Phase an.
        </p>
      </motion.div>
    </section>
  );
}
