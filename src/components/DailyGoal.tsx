import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Goal {
  goal_text: string;
  target_amount: number | null;
}

export default function DailyGoal() {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoal = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("daily_goals")
        .select("goal_text, target_amount")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setGoal(data);
      setLoading(false);
    };
    fetchGoal();
  }, []);

  if (loading) {
    return (
      <div className="glass-card-subtle rounded-xl p-3 lg:p-5 text-center animate-pulse">
        <div className="h-4 w-20 mx-auto bg-secondary rounded mb-2" />
        <div className="h-7 w-24 mx-auto bg-secondary rounded" />
      </div>
    );
  }

  return (
    <div className="glass-card-subtle rounded-xl p-3 lg:p-5 text-center col-span-2 lg:col-span-4">
      <div className="flex items-center justify-center gap-2 mb-1">
        <Target className="h-4 w-4 text-accent" />
        <p className="text-[10px] lg:text-xs text-muted-foreground">Dein Tagesziel</p>
      </div>
      {goal ? (
        <>
          <p className="text-lg lg:text-xl font-bold text-gold-gradient">{goal.goal_text}</p>
          {goal.target_amount != null && (
            <p className="text-xs text-muted-foreground mt-0.5">{goal.target_amount.toLocaleString("de-DE")}€ Ziel</p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground italic">Kein Tagesziel hinterlegt</p>
      )}
    </div>
  );
}
