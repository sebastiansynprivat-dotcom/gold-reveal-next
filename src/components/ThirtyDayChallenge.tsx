import { useEffect, useState } from "react";
import { Flame, Trophy, Heart, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "thirty_day_challenge_start";

export default function ThirtyDayChallenge() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setStartDate(new Date(stored));

    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.created_at) setUserCreatedAt(new Date(data.user.created_at));
    });
  }, []);

  const handleStart = () => {
    const now = userCreatedAt ?? new Date();
    localStorage.setItem(STORAGE_KEY, now.toISOString());
    setStartDate(now);
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
            <p className="text-xs text-center mt-3 text-muted-foreground">
              {completed
                ? "🏆 Challenge abgeschlossen – du gehörst jetzt zu den Durchziehern!"
                : `Noch ${30 - dayNumber} Tage bis zum Bonus. Halte durch!`}
            </p>
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
