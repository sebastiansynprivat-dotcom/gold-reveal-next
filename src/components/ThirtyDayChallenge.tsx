import { useEffect, useState } from "react";
import { Flame, Trophy, Heart, Target, TrendingUp, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "thirty_day_challenge_start";
const UPGRADE_SHOWN_KEY = "thirty_day_upgrade_shown";

export default function ThirtyDayChallenge() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(null);
  const [upgradeRevealed, setUpgradeRevealed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setStartDate(new Date(stored));

    const shown = localStorage.getItem(UPGRADE_SHOWN_KEY);
    if (shown === "true") setUpgradeRevealed(true);

    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.created_at) setUserCreatedAt(new Date(data.user.created_at));
    });
  }, []);

  const handleStart = () => {
    const now = userCreatedAt ?? new Date();
    localStorage.setItem(STORAGE_KEY, now.toISOString());
    setStartDate(now);
  };

  const revealUpgrade = () => {
    localStorage.setItem(UPGRADE_SHOWN_KEY, "true");
    setUpgradeRevealed(true);
  };

  const dayNumber = startDate
    ? Math.min(
        30,
        Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      )
    : 0;
  const progress = startDate ? Math.min(100, (dayNumber / 30) * 100) : 0;
  const completed = dayNumber >= 30;

  return (
    <div className="relative glass-card rounded-2xl p-5 lg:p-6 border border-accent/30 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-accent/5 pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
              <Trophy className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-base lg:text-lg font-bold text-foreground">
                30-Tage Starter-Challenge
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dein Bonus-Programm für den perfekten Start
              </p>
            </div>
          </div>
          {startDate && !completed && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 border border-accent/30 shrink-0">
              <Flame className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-bold text-accent">Tag {dayNumber}/30</span>
            </div>
          )}
          {completed && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/30 shrink-0">
              <Star className="h-3.5 w-3.5 text-green-400" />
              <span className="text-xs font-bold text-green-400">Abgeschlossen</span>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Bleib <span className="text-foreground font-semibold">30 Tage am Ball</span>,
          baue eine echte Kundenbindung auf und etabliere dich als verlässlicher Chatter.
          Wer durchzieht, sieht die ersten echten Ergebnisse – versprochen.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="glass-card-subtle rounded-lg p-2.5 border border-border/30 text-center">
            <Flame className="h-4 w-4 text-accent mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground leading-tight">Täglich aktiv</p>
          </div>
          <div className="glass-card-subtle rounded-lg p-2.5 border border-border/30 text-center">
            <Heart className="h-4 w-4 text-accent mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground leading-tight">Kundenbindung</p>
          </div>
          <div className="glass-card-subtle rounded-lg p-2.5 border border-border/30 text-center">
            <Target className="h-4 w-4 text-accent mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground leading-tight">Erste Erfolge</p>
          </div>
        </div>

        {startDate ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Fortschritt</span>
              <span className="text-xs font-bold text-accent">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2.5" />

            {completed && !upgradeRevealed && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  <span className="text-sm font-bold text-accent">Leistungs-Upgrade freigeschaltet!</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Glückwunsch – du hast bewiesen, dass du dranbleibst. Chatter, die die 30-Tage-Challenge meistern, qualifizieren sich für das <span className="text-foreground font-semibold">Performance-Plus-Programm</span> mit verbesserten Konditionen.
                </p>
                <Button
                  onClick={revealUpgrade}
                  size="sm"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-xs"
                >
                  Upgrade-Details anzeigen
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}

            {completed && upgradeRevealed && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-accent/5 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-bold text-green-400">Performance-Plus-Programm</span>
                </div>
                <ul className="space-y-2 mb-3">
                  <li className="flex items-start gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                    <span>Höhere Vergütung pro Arbeitsstunde – deine Treue zahlt sich aus</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                    <span>Premium-Accounts mit besserer Conversion-Rate</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Heart className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                    <span>Priorisierter Support und exklusive Schulungsinhalte</span>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Melde dich beim Support, um dein Upgrade zu aktivieren. Dein nächster Schritt: noch mehr verdienen mit denselten Skills.
                </p>
              </div>
            )}

            {!completed && (
              <p className="text-xs text-center mt-3 text-muted-foreground">
                Noch {30 - dayNumber} Tage bis zum Bonus. Halte durch!
              </p>
            )}
          </>
        ) : (
          <Button
            onClick={handleStart}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
          >
            Challenge starten
          </Button>
        )}
      </div>
    </div>
  );
}
