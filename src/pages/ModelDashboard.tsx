import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { TrendingUp, Wallet, Crown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
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
  const [revenuePercentage, setRevenuePercentage] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: mu } = await supabase
        .from("model_users")
        .select("account_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mu) { setLoading(false); return; }

      const { data: acc } = await supabase
        .from("accounts")
        .select("account_email, account_domain")
        .eq("id", mu.account_id)
        .single();

      if (acc) setAccountName(acc.account_email || acc.account_domain);

      const { data: md } = await supabase
        .from("model_dashboard")
        .select("revenue_percentage, crypto_address, monthly_revenue")
        .eq("account_id", mu.account_id)
        .maybeSingle();

      if (md) {
        setRevenuePercentage(md.revenue_percentage || 0);
        setCryptoAddress(md.crypto_address || "");
        setMonthlyRevenue(Number(md.monthly_revenue) || 0);
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
        {/* Big golden revenue card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="gold-gradient-border-animated pulse-glow rounded-xl p-6 text-center space-y-3"
        >
          <Crown className="h-8 w-8 text-accent mx-auto" />
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Monatsumsatz</p>
          <p className="text-5xl font-black text-gold-gradient tabular-nums leading-none">
            <AnimatedValue value={monthlyRevenue} />
          </p>
        </motion.div>

        {/* Verdienst card */}
        {revenuePercentage > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="glass-card rounded-xl p-5 flex items-center gap-4"
          >
            <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dein Verdienst ({revenuePercentage}%)</p>
              <p className="text-2xl font-bold text-accent tabular-nums">
                <AnimatedValue value={verdienst} />
              </p>
            </div>
          </motion.div>
        )}

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
