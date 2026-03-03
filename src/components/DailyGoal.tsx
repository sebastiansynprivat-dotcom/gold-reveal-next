import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function DailyGoal() {
  const [goalAmount, setGoalAmount] = useState<number>(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoal = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("daily_goals")
        .select("target_amount")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.target_amount != null) {
        setGoalAmount(Number(data.target_amount));
      }
      setLoading(false);
    };
    fetchGoal();
  }, []);

  if (loading) {
    return (
      <div className="glass-card-subtle rounded-xl p-3 lg:p-5 text-center animate-pulse">
        <div className="h-3 w-16 mx-auto bg-secondary rounded mb-1.5" />
        <div className="h-7 w-14 mx-auto bg-secondary rounded" />
      </div>
    );
  }

  return (
    <div className="glass-card-subtle rounded-xl p-3 lg:p-5 text-center">
      <p className="text-[10px] lg:text-xs text-muted-foreground mb-0.5">Tagesziel</p>
      <p className="text-xl lg:text-2xl font-bold text-gold-gradient">
        {goalAmount.toLocaleString("de-DE")}€
      </p>
    </div>
  );
}
