import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { TrendingUp, Calendar, DollarSign, Wallet, Crown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import ModelBillingInfo from "@/components/ModelBillingInfo";

function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    if (start === target) { setValue(target); return; }
    const startTime = performance.now();
    let raf: number;
    const anim = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (progress < 1) raf = requestAnimationFrame(anim);
    };
    raf = requestAnimationFrame(anim);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function AnimatedValue({ value, suffix = "€", className }: { value: number; suffix?: string; className?: string }) {
  const animated = useAnimatedCounter(value);
  return <span className={className}>{animated.toLocaleString("de-DE")}{suffix}</span>;
}

const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const staggerItem = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5 } },
};

export default function ModelDashboard() {
  const { user, signOut } = useAuth();
  const [accountName, setAccountName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [revenuePercentage, setRevenuePercentage] = useState(0);
  const [yesterdayRevenue, setYesterdayRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get model_users link
      const { data: mu } = await supabase
        .from("model_users")
        .select("account_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mu) { setLoading(false); return; }
      setAccountId(mu.account_id);

      // Get account info
      const { data: acc } = await supabase
        .from("accounts")
        .select("account_email, account_domain")
        .eq("id", mu.account_id)
        .single();

      if (acc) setAccountName(acc.account_email || acc.account_domain);

      // Get revenue percentage
      const { data: md } = await supabase
        .from("model_dashboard")
        .select("revenue_percentage, crypto_address")
        .eq("account_id", mu.account_id)
        .maybeSingle();

      if (md) {
        setRevenuePercentage(md.revenue_percentage || 0);
        setCryptoAddress(md.crypto_address || "");
      }

      // Get chatter user IDs assigned to this account
      const { data: assignments } = await supabase
        .from("account_assignments")
        .select("user_id")
        .eq("account_id", mu.account_id);

      const userIds = [...new Set((assignments || []).map(a => a.user_id))];
      if (userIds.length === 0) { setLoading(false); return; }

      // Get all revenue
      const { data: revenue } = await supabase
        .from("daily_revenue")
        .select("date, amount")
        .in("user_id", userIds);

      if (revenue) {
        const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
        const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

        const yRev = revenue.filter(r => r.date === yesterday).reduce((s, r) => s + Number(r.amount), 0);
        const mRev = revenue.filter(r => r.date >= monthStart).reduce((s, r) => s + Number(r.amount), 0);
        const tRev = revenue.reduce((s, r) => s + Number(r.amount), 0);

        setYesterdayRevenue(yRev);
        setMonthlyRevenue(mRev);
        setTotalRevenue(tRev);
      }

      setLoading(false);
    };
    load();
  }, [user]);

  const verdienst = useMemo(() => {
    if (revenuePercentage <= 0) return 0;
    return Math.round(monthlyRevenue * revenuePercentage / 100);
  }, [monthlyRevenue, revenuePercentage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="header-gradient-border">
        <div className="container max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-foreground leading-tight">Model Dashboard</h1>
              <p className="text-xs text-muted-foreground truncate">{accountName}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-5xl mx-auto px-4 pt-6 space-y-5">
        {/* Revenue Stats */}
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
          <motion.div variants={staggerItem} className="glass-card rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Gestern</span>
            </div>
            <AnimatedValue value={yesterdayRevenue} className="text-xl font-bold text-foreground" />
          </motion.div>

          <motion.div variants={staggerItem} className="glass-card rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Monat</span>
            </div>
            <AnimatedValue value={monthlyRevenue} className="text-xl font-bold text-foreground" />
          </motion.div>

          <motion.div variants={staggerItem} className="glass-card rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Gesamt</span>
            </div>
            <AnimatedValue value={totalRevenue} className="text-xl font-bold text-foreground" />
          </motion.div>

          <motion.div variants={staggerItem} className="glass-card rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-accent">
              <Wallet className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Verdienst</span>
            </div>
            <AnimatedValue value={verdienst} className="text-xl font-bold text-accent" />
            {revenuePercentage > 0 && (
              <p className="text-[9px] text-muted-foreground">{revenuePercentage}% Anteil</p>
            )}
          </motion.div>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="gold-gradient-border-animated pulse-glow rounded-xl p-5 text-center space-y-2"
        >
          <Crown className="h-8 w-8 text-accent mx-auto" />
          <h2 className="text-lg font-bold text-gold-gradient">Einnahmen All-Time</h2>
          <p className="text-2xl font-bold text-foreground">
            <AnimatedValue value={totalRevenue} />
          </p>
          {revenuePercentage > 0 && (
            <p className="text-sm text-muted-foreground">
              Dein Anteil: <span className="text-accent font-semibold">{revenuePercentage}%</span>
            </p>
          )}
        </motion.div>

        {/* Billing Info */}
        <ModelBillingInfo
          accountName={accountName}
          monthlyRevenue={monthlyRevenue}
          revenuePercentage={revenuePercentage}
          verdienst={verdienst}
          cryptoAddress={cryptoAddress}
        />
      </div>
    </div>
  );
}
