import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { isCommitmentTester } from "@/lib/commitmentFlag";
import { toast } from "sonner";
import { Sparkles, Sun, Moon, RotateCcw, Zap, Flame, Undo2 } from "lucide-react";

function berlinDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
}

/**
 * Nur für Allowlist-Tester sichtbar. Erlaubt sofortiges Testen des
 * Commitment-Rituals ohne auf 06–12 Uhr / 20 Uhr warten zu müssen.
 */
export default function CommitmentDebugPanel() {
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isCommitmentTester(user.id)) setUserId(user.id);
    })();
  }, []);

  if (!userId) return null;

  const goMorning = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("commit", "1");
    url.searchParams.delete("checkin");
    window.location.href = url.toString();
  };
  const goEvening = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("checkin", "1");
    url.searchParams.delete("commit");
    window.location.href = url.toString();
  };
  const resetToday = async () => {
    const { error, count } = await supabase
      .from("chatter_daily_commitment" as any)
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .eq("date", berlinDate());
    if (error) return toast.error("Reset fehlgeschlagen: " + error.message);
    toast.success(`Reset ok (${count ?? 0} Zeile). Öffne Morgen-Dialog neu…`);
    // direkt Morgen-Dialog forcieren, damit man den Reset sofort sieht
    const url = new URL(window.location.href);
    url.searchParams.set("commit", "1");
    url.searchParams.delete("checkin");
    setTimeout(() => (window.location.href = url.toString()), 400);
  };
  const triggerPulse = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("chatter-pulse-pushes", {
        body: { force: true },
      });
      if (error) throw error;
      toast.success("Pulse ausgeführt");
      console.log("pulse result", data);
    } catch (e: any) {
      toast.error("Pulse-Trigger fehlgeschlagen: " + (e?.message ?? "unknown"));
    }
  };
  const simulateStreak = async (days: number) => {
    const rows = [];
    for (let i = 1; i <= days; i++) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const date = d.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
      rows.push({
        user_id: userId,
        date,
        slots: ["morning", "noon", "evening"],
        daily_goal: 150,
        confirmed_by_user: true,
        confirmed_at: new Date().toISOString(),
      });
    }
    const { error } = await supabase
      .from("chatter_daily_commitment" as any)
      .upsert(rows, { onConflict: "user_id,date" });
    if (error) return toast.error("Streak-Simulation fehlgeschlagen");
    toast.success(`${days} Tage Fake-Streak angelegt — Seite neu laden`);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-yellow-500 text-black px-3 py-2 text-xs font-bold shadow-lg"
        >
          🧪 Test
        </button>
      ) : (
        <div className="rounded-xl border border-yellow-500/40 bg-black/90 backdrop-blur p-3 shadow-[0_0_40px_-10px_rgba(234,179,8,0.6)] w-64">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-yellow-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Commitment-Test
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/40 hover:text-white/80 text-xs"
            >
              ✕
            </button>
          </div>
          <div className="grid gap-2">
            <Button size="sm" onClick={goMorning} className="justify-start bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-100 border border-yellow-500/30">
              <Sun className="w-4 h-4 mr-2" /> Morgen-Dialog öffnen
            </Button>
            <Button size="sm" onClick={goEvening} className="justify-start bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-100 border border-yellow-500/30">
              <Moon className="w-4 h-4 mr-2" /> Abend-Check-in öffnen
            </Button>
            <Button size="sm" variant="outline" onClick={resetToday} className="justify-start border-white/20 bg-white/5 text-white/80 hover:bg-white/10">
              <RotateCcw className="w-4 h-4 mr-2" /> Heutigen Eintrag löschen
            </Button>
            <Button size="sm" variant="outline" onClick={triggerPulse} className="justify-start border-white/20 bg-white/5 text-white/80 hover:bg-white/10">
              <Zap className="w-4 h-4 mr-2" /> Pulse-Push jetzt
            </Button>
            <Button size="sm" variant="outline" onClick={() => simulateStreak(6)} className="justify-start border-white/20 bg-white/5 text-white/80 hover:bg-white/10">
              <Flame className="w-4 h-4 mr-2" /> Streak +6 simulieren
            </Button>
          </div>
          <p className="text-[10px] text-white/40 mt-2 leading-snug">
            Nur du siehst das. Abend-Dialog braucht einen vorhandenen Morgen-Eintrag.
          </p>
        </div>
      )}
    </div>
  );
}
