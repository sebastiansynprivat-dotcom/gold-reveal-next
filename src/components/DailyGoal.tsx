import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarDays, CalendarRange, Calendar } from "lucide-react";

interface LoginStats {
  today: number;
  week: number;
  month: number;
}

export default function DailyGoal() {
  const [goalAmount, setGoalAmount] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LoginStats>({ today: 0, week: 0, month: 0 });
  const [activeToday, setActiveToday] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Fetch goal
      const { data: goalData } = await supabase
        .from("daily_goals")
        .select("target_amount")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (goalData?.target_amount != null) {
        setGoalAmount(Number(goalData.target_amount));
      }

      // Fetch login stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [todayRes, weekRes, monthRes] = await Promise.all([
        supabase.from("login_events").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("logged_in_at", todayStart),
        supabase.from("login_events").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("logged_in_at", weekStart),
        supabase.from("login_events").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("logged_in_at", monthStart),
      ]);

      const todayCount = todayRes.count ?? 0;
      setStats({
        today: todayCount,
        week: weekRes.count ?? 0,
        month: monthRes.count ?? 0,
      });
      setActiveToday(todayCount > 0);
      setLoading(false);
    };
    fetchData();
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
    <div className="glass-card-subtle rounded-xl p-3 lg:p-5 text-center relative">
      {/* Green activity dot */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="absolute -top-1 -right-1 z-10 flex items-center justify-center w-5 h-5 rounded-full cursor-pointer focus:outline-none"
            aria-label="Login-Statistik anzeigen"
          >
            <span
              className={`block w-3 h-3 rounded-full ${
                activeToday
                  ? "bg-green-500 shadow-[0_0_8px_2px_rgba(34,197,94,0.5)] animate-pulse"
                  : "bg-muted-foreground/40"
              }`}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-3 glass-card border-border" side="bottom" align="end">
          <p className="text-[11px] font-semibold text-foreground mb-2">Login-Aktivität</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" /> Heute
              </span>
              <span className="font-semibold text-foreground">{stats.today}×</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarRange className="w-3.5 h-3.5" /> Woche
              </span>
              <span className="font-semibold text-foreground">{stats.week}×</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" /> Monat
              </span>
              <span className="font-semibold text-foreground">{stats.month}×</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <p className="text-[10px] lg:text-xs text-muted-foreground mb-0.5">Tagesziel</p>
      <p className="text-xl lg:text-2xl font-bold text-gold-gradient">
        {goalAmount.toLocaleString("de-DE")}€
      </p>
    </div>
  );
}
