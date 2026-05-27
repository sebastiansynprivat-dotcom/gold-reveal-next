import { useEffect, useState } from "react";
import { Flame, Trophy, Heart, Target, TrendingUp, Star, ArrowRight, Lock, Sparkles, Crown, Zap } from "lucide-react";
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
                Schalte dein Karriere-Upgrade frei
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
              <span className="text-xs font-bold text-green-400">Freigeschaltet</span>
            </div>
          )}
        </div>

        {/* Belohnungs-Teaser – immer sichtbar */}
        <div className="relative mb-4 p-4 rounded-xl bg-gradient-to-br from-accent/15 via-accent/5 to-transparent border border-accent/40 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-accent/30 rounded-full blur-2xl pointer-events-none animate-pulse" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-4 w-4 text-accent" />
              <span className="text-[11px] uppercase tracking-wider font-bold text-accent">
                Deine Belohnung nach 30 Tagen
              </span>
              <Sparkles className="h-3.5 w-3.5 text-accent ml-auto" />
            </div>
            <h4 className="text-base font-bold text-foreground mb-2 leading-tight">
              Account-Upgrade auf <span className="text-accent">Performance-Plus</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center gap-2 text-xs text-foreground/90">
                <TrendingUp className="h-3.5 w-3.5 text-accent shrink-0" />
                <span><span className="font-bold text-accent">Deutlich höherer</span> Traffic</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/90">
                <Zap className="h-3.5 w-3.5 text-accent shrink-0" />
                <span><span className="font-bold text-accent">Premium-Accounts</span> mit Top-Conversion</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/90">
                <Star className="h-3.5 w-3.5 text-accent shrink-0" />
                <span><span className="font-bold text-accent">Deutlich mehr</span> Verdienst für dich</span>
              </div>
            </div>
            {!completed && (
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Wird nach 30 aktiven Tagen automatisch freigeschaltet</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4 whitespace-pre-line">
          Bleib <span className="text-foreground font-semibold">30 Tage am Ball</span>, baue echte Kundenbindung auf – und qualifiziere dich für einen deutlich besseren Account.{"\n"}{"\n"}{"\n"}
          Wir prüfen nach diesen 30 Tagen ob du Gespräche mit Kunden so geführt hast, das sie über mehrere Tage gingen. Also gib dir Mühe und melde dich jederzeit bei Fragen und verdien dir dein Upgrade 🚀
        </p>

        {startDate ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Fortschritt zum Upgrade</span>
              <span className="text-xs font-bold text-accent">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2.5" />

            {completed && !upgradeRevealed && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-accent/25 to-accent/10 border border-accent/50 animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-accent" />
                  <span className="text-sm font-bold text-accent">Performance-Plus freigeschaltet!</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Du hast es geschafft. Klick hier, um dein Upgrade zu aktivieren.
                </p>
                <Button
                  onClick={revealUpgrade}
                  size="sm"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-xs"
                >
                  Upgrade jetzt aktivieren
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}

            {completed && upgradeRevealed && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-accent/5 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-bold text-green-400">Performance-Plus aktiv</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Melde dich beim Support, damit dein Upgrade auf die Accounts übertragen wird. Ab jetzt: mehr Verdienst mit denselben Skills.
                </p>
              </div>
            )}

            {!completed && (
              <p className="text-xs text-center mt-3 text-muted-foreground">
                Noch <span className="text-accent font-bold">{30 - dayNumber} Tage</span> bis zu deinem Account-Upgrade
              </p>
            )}
          </>
        ) : (
          <Button
            onClick={handleStart}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
          >
            Challenge starten & Upgrade sichern
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
