import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, CloudSun, Moon, Star, ShieldCheck, Sparkles, Trophy, TrendingUp, Zap, Flame } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { useUILanguage } from "@/hooks/useUILanguage";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { isCommitmentTester } from "@/lib/commitmentFlag";
import { getCurrentStreak, get7dAvgRevenue, berlinDate } from "@/lib/commitmentStreak";
import { getQuoteForToday } from "@/lib/commitmentQuotes";
import { getTierInfo, TIERS } from "@/lib/commitmentTiers";

type Slot = "morning" | "noon" | "evening" | "night";
type Step = 1 | 2 | 3 | 4;

const SLOT_META: { key: Slot; icon: any; de: string; en: string; hint: string }[] = [
  { key: "morning", icon: Sun, de: "Morgens", en: "Morning", hint: "06–11" },
  { key: "noon", icon: CloudSun, de: "Mittags", en: "Noon", hint: "11–16" },
  { key: "evening", icon: Star, de: "Abends", en: "Evening", hint: "16–22" },
  { key: "night", icon: Moon, de: "Nachts", en: "Night", hint: "22–06" },
];

function berlinHour(): number {
  return parseInt(
    new Date().toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "Europe/Berlin" }),
    10,
  );
}

type Row = {
  id: string;
  date: string;
  slots: string[];
  daily_goal: number | null;
  confirmed_by_user: boolean | null;
};

function fireBurst() {
  confetti({
    particleCount: 80,
    spread: 65,
    startVelocity: 45,
    origin: { y: 0.7 },
    colors: ["#fde047", "#f59e0b", "#facc15", "#ffffff"],
  });
}

function fireBigBurst() {
  confetti({
    particleCount: 150,
    spread: 100,
    startVelocity: 55,
    origin: { y: 0.6 },
    colors: ["#fde047", "#f59e0b", "#facc15", "#ffffff", "#34d399"],
  });
  setTimeout(
    () =>
      confetti({
        particleCount: 100,
        spread: 120,
        startVelocity: 40,
        origin: { y: 0.65, x: 0.3 },
        colors: ["#fde047", "#f59e0b"],
      }),
    200,
  );
  setTimeout(
    () =>
      confetti({
        particleCount: 100,
        spread: 120,
        startVelocity: 40,
        origin: { y: 0.65, x: 0.7 },
        colors: ["#fde047", "#f59e0b"],
      }),
    400,
  );
}

export default function CommitmentPrompt() {
  const { lang } = useUILanguage();
  const de = lang !== "en";
  const { playCheckSound, playStreakSound, playLevelUpSound } = useSoundEffects();

  const [userId, setUserId] = useState<string | null>(null);
  const [today, setToday] = useState<Row | null>(null);
  const [showCommit, setShowCommit] = useState(false);
  const [showEvening, setShowEvening] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);
  const [goal, setGoal] = useState<number>(150);
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState<number>(0);
  const [avg7d, setAvg7d] = useState<number>(0);
  const [rewardScreen, setRewardScreen] = useState<null | "yes" | "no">(null);
  const [checkinRow, setCheckinRow] = useState<Row | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (!isCommitmentTester(user.id)) return;
      setUserId(user.id);

      // Letzte 4 Tage laden — damit ein verpasster Abend-Check-in nachgeholt
      // werden kann und der Streak nicht unnötig verloren geht.
      const { data } = await supabase
        .from("chatter_daily_commitment" as any)
        .select("id, date, slots, daily_goal, confirmed_by_user")
        .eq("user_id", user.id)
        .gte("date", berlinDate(-3))
        .order("date", { ascending: false });
      const recent = ((data as unknown) as Row[] | null) ?? [];
      const row = recent.find((r) => r.date === berlinDate()) ?? null;
      setToday(row);
      // Ältester unbeantworteter Tag zuerst nachholen (heute ausgenommen).
      const missed = recent
        .filter((r) => r.date !== berlinDate() && r.confirmed_by_user === null)
        .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;

      const { data: prof } = await supabase
        .from("profiles")
        .select("daily_goal")
        .eq("user_id", user.id)
        .maybeSingle();
      if (prof?.daily_goal) setGoal(Number(prof.daily_goal));

      const [s, avg] = await Promise.all([
        getCurrentStreak(user.id),
        get7dAvgRevenue(user.id),
      ]);
      setStreak(s);
      setAvg7d(avg);

      const params = new URLSearchParams(window.location.search);
      const forceCommit = params.get("commit") === "1";
      const forceEvening = params.get("checkin") === "1";
      const hour = berlinHour();

      // Verpasster Abend-Check-in hat Vorrang: erst nachholen, dann neuer Tag.
      if (missed) {
        setCheckinRow(missed);
        setShowEvening(true);
      } else if (row && row.confirmed_by_user === null && (forceEvening || hour >= 18)) {
        setCheckinRow(row);
        setShowEvening(true);
      } else if (!row && (forceCommit || hour < 20)) {
        // Commitment kann den ganzen Tag bis 20 Uhr nachgeholt werden — sonst
        // verpassen Chatter, die erst nachmittags online kommen, den Tag komplett.
        setShowCommit(true);
      }
    })();
  }, []);

  async function saveCommitment() {
    if (!userId || selectedSlots.length === 0) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("chatter_daily_commitment" as any)
      .upsert(
        {
          user_id: userId,
          date: berlinDate(),
          slots: selectedSlots,
          daily_goal: goal,
        },
        { onConflict: "user_id,date" },
      )
      .select("id, date, slots, daily_goal, confirmed_by_user")
      .single();
    setSaving(false);
    if (error) {
      toast.error(de ? "Speichern fehlgeschlagen" : "Save failed");
      return;
    }
    setToday(data as any);
    setShowCommit(false);
    fireBurst();
    playLevelUpSound();
    toast.success(de ? "Commitment gesichert 🔥" : "Commitment locked in 🔥");
    const url = new URL(window.location.href);
    url.searchParams.delete("commit");
    window.history.replaceState({}, "", url.toString());
  }

  async function answerEvening(confirmed: boolean) {
    const target = checkinRow ?? today;
    if (!target) return;
    setSaving(true);
    const { error } = await supabase
      .from("chatter_daily_commitment" as any)
      .update({
        confirmed_by_user: confirmed,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", target.id);
    setSaving(false);
    if (error) {
      toast.error(de ? "Fehler" : "Error");
      return;
    }
    if (confirmed) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setRewardScreen("yes");
      if ([3, 7, 14, 30].includes(newStreak)) {
        fireBigBurst();
        playLevelUpSound();
      } else {
        fireBurst();
        playStreakSound();
      }
    } else {
      setRewardScreen("no");
      playCheckSound();
    }
  }

  const toggleSlot = (s: Slot) =>
    setSelectedSlots((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const isBackfill = !!checkinRow && checkinRow.date !== berlinDate();
  const backfillLabel = checkinRow
    ? new Date(`${checkinRow.date}T12:00:00`).toLocaleDateString(de ? "de-DE" : "en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      })
    : "";

  function closeEvening() {
    setShowEvening(false);
    setRewardScreen(null);
    setCheckinRow(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("checkin");
    window.history.replaceState({}, "", url.toString());
    // Nach einem nachgeholten Check-in ggf. direkt das heutige Commitment abfragen.
    if (isBackfill && !today && berlinHour() < 20) setShowCommit(true);
  }

  const reliabilityScore = Math.round((selectedSlots.length / 4) * 100);
  const fullCommitter = selectedSlots.length === 4;
  const quote = getQuoteForToday(de ? "de" : "en");

  const goalVsAvg = avg7d > 0 ? (goal > avg7d ? "ambitious" : "safe") : null;

  return (
    <>
      {/* MORGEN: Commitment-Dialog */}
      <Dialog open={showCommit} onOpenChange={setShowCommit}>
        <DialogContent className="max-w-md bg-black/95 border border-yellow-500/30 shadow-[0_0_60px_-15px_rgba(234,179,8,0.5)] max-h-[90vh] overflow-y-auto">
          {/* Step indicator */}
          <div className="flex gap-1 mb-1">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  n <= step ? "bg-yellow-400" : "bg-white/10",
                )}
              />
            ))}
          </div>

          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
              {step === 1 && (de ? "So verdienst du dir bessere Kunden" : "Earn your way to better clients")}
              {step === 2 && (de ? "Wann bist du heute da?" : "When are you online today?")}
              {step === 3 && (de ? "Dein Tagesziel" : "Your daily goal")}
              {step === 4 && (de ? "Dein Wort für heute" : "Your word for today")}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {step === 1 && (de
                ? "Jeder Tag, an dem du dein Wort hältst, hebt deinen Zuverlässigkeits-Score. Je höher dein Level, desto bessere Kunden kommen zu dir."
                : "Every day you keep your word raises your reliability score. The higher your level, the better clients you get.")}
              {step === 2 && (de
                ? "Wähle die Zeitfenster, in denen du heute chattest."
                : "Pick the time slots you'll chat in today.")}
              {step === 3 && (de ? "Setz ein Ziel, das dich zieht." : "Set a goal that pulls you.")}
              {step === 4 && (de
                ? "Um 21 Uhr fragen wir kurz — 1 Klick, dein Streak wächst."
                : "We'll ask you at 9 PM — one tap, your streak grows.")}
            </DialogDescription>
          </DialogHeader>

          {/* STEP 1: Reliability Progress */}
          {step === 1 && (() => {
            const t = getTierInfo(streak);
            return (
              <div className="space-y-4 py-2">
                {/* Current tier hero */}
                <div className="rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-black/40 to-yellow-600/5 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-white/40">
                        {de ? "Dein Level" : "Your level"}
                      </div>
                      <div className={cn("text-2xl font-bold", t.current.color)} style={{ textShadow: `0 0 20px ${t.current.glow}` }}>
                        {de ? t.current.de : t.current.en}
                      </div>
                      <div className="text-xs text-white/60 mt-0.5">
                        {de ? t.current.perk_de : t.current.perk_en}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Flame className={cn("w-4 h-4", streak >= 3 ? "text-orange-400" : "text-yellow-400/60")} />
                        <span className="text-xl font-bold text-white">{streak}</span>
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-white/40">
                        {de ? "Tage Streak" : "Day streak"}
                      </div>
                    </div>
                  </div>

                  {/* Progress to next tier */}
                  {t.next ? (
                    <>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-white/50">
                          {de ? "Nächstes Level" : "Next level"}: <span className={cn("font-semibold", t.next.color)}>{de ? t.next.de : t.next.en}</span>
                        </span>
                        <span className="text-white/60 font-semibold">
                          {t.daysToNext} {de ? (t.daysToNext === 1 ? "Tag" : "Tage") : t.daysToNext === 1 ? "day" : "days"}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${t.progress}%` }}
                          transition={{ duration: 0.9, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500"
                          style={{ boxShadow: "0 0 12px rgba(234,179,8,0.6)" }}
                        />
                      </div>
                      <div className="text-[11px] text-white/50 mt-1.5">
                        {de
                          ? <>Halte dein Wort noch <b className="text-yellow-300">{t.daysToNext} {t.daysToNext === 1 ? "Tag" : "Tage"}</b> → freischalten: <b className={t.next.color}>{de ? t.next.perk_de : t.next.perk_en}</b></>
                          : <>Keep your word for <b className="text-yellow-300">{t.daysToNext} more {t.daysToNext === 1 ? "day" : "days"}</b> → unlock: <b className={t.next.color}>{t.next.perk_en}</b></>}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-fuchsia-300 font-semibold">
                      {de ? "Höchste Stufe erreicht. Erste Wahl bei allem." : "Top tier reached. First pick, always."}
                    </div>
                  )}
                </div>

                {/* Tier ladder */}
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                    {de ? "Zuverlässigkeits-Leiter" : "Reliability ladder"}
                  </div>
                  <div className="space-y-1.5">
                    {TIERS.map((tier, i) => {
                      const reached = streak >= tier.min;
                      const isCurrent = tier.key === t.current.key;
                      return (
                        <div
                          key={tier.key}
                          className={cn(
                            "flex items-center justify-between text-xs rounded-md px-2 py-1.5 transition-all",
                            isCurrent && "bg-yellow-500/10 border border-yellow-500/40",
                            !isCurrent && reached && "opacity-70",
                            !reached && "opacity-40",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn("w-5 text-center font-mono", reached ? tier.color : "text-white/40")}>
                              {reached ? "✓" : i + 1}
                            </span>
                            <span className={cn("font-semibold", reached ? tier.color : "text-white/60")}>
                              {de ? tier.de : tier.en}
                            </span>
                            <span className="text-white/40">· {tier.min}d</span>
                          </div>
                          <span className="text-white/50 text-[11px]">
                            {de ? tier.perk_de : tier.perk_en}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* How to keep your level */}
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/[0.05] p-3">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-white/70 leading-relaxed">
                      {de
                        ? <>So bleibst du im Level: <b className="text-yellow-300">Morgens deine Verfügbarkeit angeben</b> + <b className="text-yellow-300">abends ehrlich bestätigen</b>, ob du da warst. Ein ehrliches „Nein, heute nicht" zählt nicht gegen dich — aber fehlt oder stimmt nicht, bricht die Streak.</>
                        : <>How to stay in your level: <b className="text-yellow-300">State your availability in the morning</b> + <b className="text-yellow-300">honestly confirm in the evening</b> whether you were there. An honest "No, not today" doesn't count against you — but missing or dishonest breaks the streak.</>}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-white/40 text-center leading-relaxed px-2">
                  {de
                    ? "Kein Zufall. Wer dranbleibt, bekommt die besseren Karten."
                    : "Not luck. Whoever stays consistent gets the better hand."}
                </p>
              </div>
            );
          })()}

          {/* STEP 2: Slots */}
          {step === 2 && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/[0.05] p-3">
                <p className="text-[11px] text-white/70 leading-relaxed">
                  {de
                    ? <>Grobe Angabe reicht — du musst nicht den ganzen Slot durchgehend online sein. <b className="text-yellow-300">Wer mehr Slots abdeckt, bekommt stärkeren Push.</b></>
                    : <>A rough estimate is enough — you don't need to be online the entire slot. <b className="text-yellow-300">The more slots you cover, the stronger the push.</b></>}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SLOT_META.map(({ key, icon: Icon, de: dl, en: el, hint }) => {
                  const active = selectedSlots.includes(key);
                  return (
                    <motion.button
                      key={key}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        toggleSlot(key);
                        playCheckSound();
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl p-4 border-2 transition-all",
                        active
                          ? "border-yellow-400 bg-yellow-500/10 shadow-[0_0_20px_-5px_rgba(234,179,8,0.6)]"
                          : "border-white/10 bg-white/5 hover:border-white/20",
                      )}
                    >
                      <Icon className={cn("w-6 h-6", active ? "text-yellow-400" : "text-white/60")} />
                      <span className={cn("font-semibold", active ? "text-yellow-300" : "text-white/80")}>
                        {de ? dl : el}
                      </span>
                      <span className="text-xs text-white/40">{hint}</span>
                    </motion.button>
                  );
                })}
              </div>
              {selectedSlots.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "rounded-lg border p-3 flex items-center justify-between",
                    fullCommitter
                      ? "border-yellow-400 bg-yellow-500/10 shadow-[0_0_15px_-5px_rgba(234,179,8,0.5)]"
                      : "border-emerald-500/30 bg-emerald-500/5",
                  )}
                >
                  <div className="text-sm">
                    <div className={cn("font-semibold", fullCommitter ? "text-yellow-300" : "text-emerald-300")}>
                      {fullCommitter
                        ? de ? "🔥 Vollzeit-Committer" : "🔥 Full-time committer"
                        : de ? `${selectedSlots.length} von 4 Slots` : `${selectedSlots.length} of 4 slots`}
                    </div>
                    <div className="text-xs text-white/60">
                      {de ? "Zuverlässigkeits-Score" : "Reliability score"}: <b>{reliabilityScore}%</b>
                    </div>
                  </div>
                  <div className={cn("text-2xl font-bold", fullCommitter ? "text-yellow-300" : "text-emerald-300")}>
                    {reliabilityScore}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* STEP 3: Goal */}
          {step === 3 && (() => {
            const roundTo5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
            const recommended = avg7d > 0 ? roundTo5(avg7d * 1.15) : 30;
            const sliderMax = Math.max(500, roundTo5(Math.max(avg7d * 2, goal + 100)));
            return (
              <div className="py-4 space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                    {goal}€
                  </div>
                  <div className="text-sm text-white/50 mt-1">{de ? "Tagesziel" : "Daily goal"}</div>
                </div>

                <Slider
                  value={[Math.min(goal, sliderMax)]}
                  onValueChange={(v) => setGoal(v[0])}
                  min={5}
                  max={sliderMax}
                  step={5}
                />

                {/* Quick presets + manual input */}
                <div className="flex flex-wrap items-center gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => { setGoal(recommended); playCheckSound(); }}
                    className="rounded-full border border-yellow-400/60 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-200 hover:bg-yellow-500/20 transition"
                  >
                    {de ? "Empfehlung" : "Recommended"}: {recommended}€
                  </button>
                  {[5, 20, 50, 100].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => { setGoal(v); playCheckSound(); }}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition",
                        goal === v
                          ? "border-yellow-400 bg-yellow-500/15 text-yellow-200"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20",
                      )}
                    >
                      {v}€
                    </button>
                  ))}
                  <div className="flex items-center gap-1 text-xs text-white/60">
                    <span>{de ? "eigener Wert:" : "custom:"}</span>
                    <input
                      type="number"
                      min={5}
                      value={goal}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        if (!isNaN(n) && n >= 5) setGoal(n);
                      }}
                      className="w-20 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-white text-sm text-right focus:outline-none focus:border-yellow-400"
                    />
                    <span>€</span>
                  </div>
                </div>

                {avg7d > 0 && (
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
                    <div className="text-xs text-white/50">
                      {de ? "Dein Ø der letzten 7 Tage" : "Your 7-day average"}
                    </div>
                    <div className="text-lg font-semibold text-white/90">{avg7d}€</div>
                    {goalVsAvg === "ambitious" && (
                      <div className="text-xs text-yellow-300 mt-1">
                        {de ? "Ambitioniert 💪" : "Ambitious 💪"}
                      </div>
                    )}
                    {goalVsAvg === "safe" && (
                      <div className="text-xs text-emerald-300 mt-1">
                        {de ? "Sicher & solide ✅" : "Safe & solid ✅"}
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/[0.05] p-3">
                  <p className="text-[11px] text-white/75 leading-relaxed">
                    {de
                      ? <>Setz dir ein Ziel, das <b className="text-yellow-300">knapp über deinem Schnitt</b> liegt. Kleine Steigerungen jede Woche = am Monatsende deutlich mehr Umsatz (und mehr Provision für dich). Minimum sind <b className="text-yellow-300">5€</b> — starte klein, wenn du unsicher bist. Nach oben gibt's <b className="text-yellow-300">kein Limit</b>.</>
                      : <>Set a goal <b className="text-yellow-300">slightly above your average</b>. Small weekly bumps = way more revenue by month-end (and more commission for you). Minimum is <b className="text-yellow-300">€5</b> — start small if you're unsure. <b className="text-yellow-300">No upper limit.</b></>}
                  </p>
                </div>
              </div>
            );
          })()}


          {/* STEP 4: Dein Wort */}
          {step === 4 && (
            <div className="py-4 space-y-4 text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="flex flex-col items-center gap-1"
              >
                <div className="relative">
                  <Flame
                    className={cn(
                      "w-16 h-16",
                      streak >= 3
                        ? "text-orange-400 drop-shadow-[0_0_20px_rgba(251,146,60,0.8)]"
                        : "text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.6)]",
                    )}
                  />
                </div>
                <div className="text-5xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                  {streak}
                </div>
                <div className="text-xs text-white/50 uppercase tracking-widest">
                  {de ? (streak === 1 ? "Tag Streak" : "Tage Streak") : streak === 1 ? "Day streak" : "Day streak"}
                </div>
              </motion.div>

              <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3">
                <p className="text-sm italic text-yellow-100/90 leading-snug">"{quote}"</p>
              </div>

              <p className="text-xs text-white/50 leading-relaxed">
                {de
                  ? "Sag dein Wort — halte es. Zuverlässigkeit über Tage → bessere Accounts, größere Kunden."
                  : "Give your word — keep it. Reliability over days → better accounts, bigger clients."}
              </p>
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as Step)}>
                {de ? "Zurück" : "Back"}
              </Button>
            ) : (
              <div />
            )}
            {step < 4 ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={step === 2 && selectedSlots.length === 0}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:from-yellow-400 hover:to-yellow-500"
              >
                {de ? "Weiter" : "Next"}
              </Button>
            ) : (
              <Button
                onClick={saveCommitment}
                disabled={saving}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:from-yellow-400 hover:to-yellow-500"
              >
                {de ? "Ich bin dabei 🔥" : "I'm in 🔥"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ABEND: Honesty-Check-in */}
      <Dialog
        open={showEvening}
        onOpenChange={(o) => {
          if (!o) closeEvening();
          else setShowEvening(true);
        }}
      >
        <DialogContent className="max-w-md bg-black/95 border border-yellow-500/30 shadow-[0_0_60px_-15px_rgba(234,179,8,0.5)]">
          <AnimatePresence mode="wait">
            {rewardScreen === "yes" && (
              <motion.div
                key="yes-reward"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="py-6 text-center space-y-4"
              >
                <motion.div
                  initial={{ scale: 0.4, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="flex justify-center"
                >
                  <Flame className="w-20 h-20 text-orange-400 drop-shadow-[0_0_25px_rgba(251,146,60,0.8)]" />
                </motion.div>
                <div>
                  <div className="text-6xl font-bold bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                    {streak}
                  </div>
                  <div className="text-sm text-white/60 mt-1">
                    {de ? "Tage in Folge" : "days in a row"}
                  </div>
                </div>
                {[3, 7, 14, 30].includes(streak) && (
                  <div className="rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/40 p-3">
                    <div className="text-yellow-200 font-bold">
                      {de ? `🏆 ${streak}-Tage-Meilenstein!` : `🏆 ${streak}-day milestone!`}
                    </div>
                    <div className="text-xs text-yellow-100/70 mt-1">
                      {de ? "Du bist offiziell im Priority Pool oben." : "You're officially top of the Priority Pool."}
                    </div>
                  </div>
                )}
                <p className="text-sm text-white/70">
                  {de ? "Streak gesichert um 23 Uhr. Morgen weiter." : "Streak locks at 11 PM. See you tomorrow."}
                </p>
                <Button
                  onClick={closeEvening}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold w-full"
                >
                  {de ? "Weiter" : "Continue"}
                </Button>
              </motion.div>
            )}

            {rewardScreen === "no" && (
              <motion.div
                key="no-reward"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-6 text-center space-y-4"
              >
                <div className="text-4xl">🌙</div>
                <div>
                  <div className="text-xl font-bold text-white">
                    {de ? "Danke für die Ehrlichkeit." : "Thanks for the honesty."}
                  </div>
                  <p className="text-sm text-white/60 mt-2 leading-relaxed">
                    {de
                      ? "Streak pausiert — nicht gebrochen. Morgen ist ein neuer Tag."
                      : "Streak paused — not broken. Tomorrow is a new day."}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setShowEvening(false);
                    setRewardScreen(null);
                    const url = new URL(window.location.href);
                    url.searchParams.delete("checkin");
                    window.history.replaceState({}, "", url.toString());
                  }}
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white/80 hover:bg-white/10 w-full"
                >
                  {de ? "Schließen" : "Close"}
                </Button>
              </motion.div>
            )}

            {!rewardScreen && (
              <motion.div key="question" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-white">
                    {de
                      ? "Warst du heute wie versprochen für deine Models da?"
                      : "Were you there for your models today as promised?"}
                  </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                  <div className="flex items-start gap-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3">
                    <ShieldCheck className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-100/70 leading-relaxed">
                      {de ? (
                        <>
                          Kurze Info: Wir gleichen deine Antwort automatisch mit Login- und Sale-Aktivität ab.{" "}
                          <span className="text-yellow-300">Ehrliches „Nein" kostet dich nichts</span> — dein Streak pausiert.{" "}
                          Ein „Ja", das nicht passt, kostet eine Tier-Stufe. Ehrlichkeit lohnt sich hier immer.
                        </>
                      ) : (
                        <>
                          Heads up: we cross-check your answer with login and sale activity.{" "}
                          <span className="text-yellow-300">An honest "No" costs nothing</span> — your streak just pauses.
                          A "Yes" that doesn't match costs a tier. Honesty always wins here.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Button
                    onClick={() => answerEvening(true)}
                    disabled={saving}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:from-yellow-400 hover:to-yellow-500 h-12"
                  >
                    ✅ {de ? "Ja, war ich" : "Yes, I was"}
                  </Button>
                  <Button
                    onClick={() => answerEvening(false)}
                    disabled={saving}
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white/80 hover:bg-white/10 h-12"
                  >
                    😔 {de ? "Heute nicht geschafft" : "Didn't make it today"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}

