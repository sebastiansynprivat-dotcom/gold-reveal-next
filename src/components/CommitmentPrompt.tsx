import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";
import { Sun, CloudSun, Moon, Star, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUILanguage } from "@/hooks/useUILanguage";

type Slot = "morning" | "noon" | "evening" | "night";

const SLOT_META: { key: Slot; icon: any; de: string; en: string; hint: string }[] = [
  { key: "morning", icon: Sun, de: "Morgens", en: "Morning", hint: "06–11" },
  { key: "noon", icon: CloudSun, de: "Mittags", en: "Noon", hint: "11–16" },
  { key: "evening", icon: Star, de: "Abends", en: "Evening", hint: "16–22" },
  { key: "night", icon: Moon, de: "Nachts", en: "Night", hint: "22–06" },
];

function berlinDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
}
function berlinHour(): number {
  return parseInt(
    new Date().toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "Europe/Berlin" }),
    10
  );
}

type Row = {
  id: string;
  date: string;
  slots: string[];
  daily_goal: number | null;
  confirmed_by_user: boolean | null;
};

export default function CommitmentPrompt() {
  const { lang } = useUILanguage();
  const de = lang !== "en";
  const [userId, setUserId] = useState<string | null>(null);
  const [today, setToday] = useState<Row | null>(null);
  const [showCommit, setShowCommit] = useState(false);
  const [showEvening, setShowEvening] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);
  const [goal, setGoal] = useState<number>(150);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("chatter_daily_commitment" as any)
        .select("id, date, slots, daily_goal, confirmed_by_user")
        .eq("user_id", user.id)
        .eq("date", berlinDate())
        .maybeSingle();
      const row = data as Row | null;
      setToday(row);

      // Fetch daily_goal default
      const { data: prof } = await supabase
        .from("profiles")
        .select("daily_goal")
        .eq("user_id", user.id)
        .maybeSingle();
      if (prof?.daily_goal) setGoal(Number(prof.daily_goal));

      const params = new URLSearchParams(window.location.search);
      const forceCommit = params.get("commit") === "1";
      const forceEvening = params.get("checkin") === "1";
      const hour = berlinHour();

      if (!row && (forceCommit || (hour >= 6 && hour <= 12))) {
        setShowCommit(true);
      } else if (row && row.confirmed_by_user === null && (forceEvening || hour >= 20)) {
        setShowEvening(true);
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
        { onConflict: "user_id,date" }
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
    toast.success(de ? "Commitment gesichert 🔥" : "Commitment locked in 🔥");
    // clean URL
    const url = new URL(window.location.href);
    url.searchParams.delete("commit");
    window.history.replaceState({}, "", url.toString());
  }

  async function answerEvening(confirmed: boolean) {
    if (!today) return;
    setSaving(true);
    const { error } = await supabase
      .from("chatter_daily_commitment" as any)
      .update({
        confirmed_by_user: confirmed,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", today.id);
    setSaving(false);
    if (error) {
      toast.error(de ? "Fehler" : "Error");
      return;
    }
    setShowEvening(false);
    if (confirmed) {
      toast.success(de ? "Bestätigt — Streak sichert sich um 23 Uhr." : "Confirmed — streak locks at 11 PM.");
    } else {
      toast(de ? "Danke für die Ehrlichkeit — kein Streak-Bruch." : "Thanks for being honest — no streak reset.");
    }
  }

  const toggleSlot = (s: Slot) =>
    setSelectedSlots((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <>
      {/* MORGEN: Commitment-Dialog */}
      <Dialog open={showCommit} onOpenChange={setShowCommit}>
        <DialogContent className="max-w-md bg-black/95 border border-yellow-500/30 shadow-[0_0_60px_-15px_rgba(234,179,8,0.5)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
              {step === 1 && (de ? "Wann bist du heute da?" : "When are you online today?")}
              {step === 2 && (de ? "Dein Tagesziel" : "Your daily goal")}
              {step === 3 && (de ? "Bereit?" : "Ready?")}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {step === 1 && (de
                ? "Wähle deine Slots. Zuverlässige Chatter kommen in den Priority-Pool."
                : "Pick your slots. Reliable chatters unlock the priority pool.")}
              {step === 2 && (de ? "Nur du — dein Ziel." : "Just you — your goal.")}
              {step === 3 && (de
                ? "Am Abend fragen wir kurz nach. 1 Klick — dein Streak wächst."
                : "We'll ask you tonight. One tap — your streak grows.")}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="grid grid-cols-2 gap-3 py-4">
              {SLOT_META.map(({ key, icon: Icon, de: dl, en: el, hint }) => {
                const active = selectedSlots.includes(key);
                return (
                  <motion.button
                    key={key}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleSlot(key)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl p-4 border-2 transition-all",
                      active
                        ? "border-yellow-400 bg-yellow-500/10 shadow-[0_0_20px_-5px_rgba(234,179,8,0.6)]"
                        : "border-white/10 bg-white/5 hover:border-white/20"
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
          )}

          {step === 2 && (
            <div className="py-6 space-y-6">
              <div className="text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                  {goal}€
                </div>
                <div className="text-sm text-white/50 mt-1">{de ? "Tagesziel" : "Daily goal"}</div>
              </div>
              <Slider
                value={[goal]}
                onValueChange={(v) => setGoal(v[0])}
                min={50}
                max={1000}
                step={10}
              />
            </div>
          )}

          {step === 3 && (
            <div className="py-6 space-y-4 text-center">
              <Sparkles className="w-12 h-12 mx-auto text-yellow-400" />
              <p className="text-white/80 leading-relaxed">
                {de
                  ? "Du bist commited für heute. Zuverlässigkeit über mehrere Tage → bessere Accounts, größere Kunden."
                  : "You're committed for today. Reliability over time → better accounts, bigger clients."}
              </p>
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as any)}>
                {de ? "Zurück" : "Back"}
              </Button>
            ) : (
              <div />
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as any)}
                disabled={step === 1 && selectedSlots.length === 0}
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
      <Dialog open={showEvening} onOpenChange={setShowEvening}>
        <DialogContent className="max-w-md bg-black/95 border border-yellow-500/30 shadow-[0_0_60px_-15px_rgba(234,179,8,0.5)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              {de ? "Warst du heute wie versprochen für deine Models da?" : "Were you there for your models today as promised?"}
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
        </DialogContent>
      </Dialog>
    </>
  );
}
