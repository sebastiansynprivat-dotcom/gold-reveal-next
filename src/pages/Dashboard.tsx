import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Save, CheckCircle2, Award, Zap, HelpCircle, FileText, Clock, Users, Pencil, ChevronDown, Copy, Smartphone, Mic, MessageSquare, ExternalLink, Gift, Crown } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import DashboardChat from "@/components/DashboardChat";
import BillingAudioDialog from "@/components/BillingAudioDialog";
import DailyChecklist from "@/components/DailyChecklist";
import MassDmGenerator from "@/components/MassDmGenerator";
import DailyGoal from "@/components/DailyGoal";
import StreakTracker from "@/components/StreakTracker";
import NotificationBanner from "@/components/NotificationBanner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { format, endOfMonth, addMonths, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import HomescreenTutorial from "@/components/HomescreenTutorial";
import PushNotificationDialog from "@/components/PushNotificationDialog";
import AccountMemoDialog from "@/components/AccountMemoDialog";
import FrageMemoDialog from "@/components/FrageMemoDialog";
import ModelRequestDialog, { EditRequestData } from "@/components/ModelRequestDialog";

const GOLD_THRESHOLD = 3000;
const STARTER_RATE = 0.2;
const GOLD_RATE = 0.25;

// Animated counter hook
function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    if (start === target) { setValue(target); return; }
    const startTime = performance.now();
    let raf: number;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(Math.round(start + (target - start) * eased));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// Stagger container/item variants
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
} as const;
const staggerItem = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5 } },
} as const;

const sectionVariants = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
} as const;

function AnimatedValue({ value, suffix = "€", className }: { value: number; suffix?: string; className?: string }) {
  const animated = useAnimatedCounter(value);
  return <span className={className}>{animated.toLocaleString("de-DE")}{suffix}</span>;
}

function AnimatedDecimalValue({ value, suffix = "€", className }: { value: number; suffix?: string; className?: string }) {
  const animated = useAnimatedCounter(Math.round(value * 100));
  const display = (animated / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <span className={className}>{display}{suffix}</span>;
}

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const platform = searchParams.get("platform") || "Brezzels";

  const { user } = useAuth();

  const [telegramId, setTelegramId] = useState("");
  const [telegramSaved, setTelegramSaved] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(true);

  const [groupName, setGroupName] = useState("");
  const [groupNameSaved, setGroupNameSaved] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);

  const [offer, setOffer] = useState("");
  const [assignedAccounts, setAssignedAccounts] = useState<{id: string;account_email: string;account_password: string;account_domain: string;platform: string;assigned_at: string | null;drive_folder_id?: string;model_language?: string;model_active?: boolean;}[]>([]);
  const [modelInactiveInfoOpen, setModelInactiveInfoOpen] = useState(false);
  const [demoModelInactive, setDemoModelInactive] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(true);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<any>(null);
  const [seenRequestIds, setSeenRequestIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("seen_request_updates");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const loadMyRequests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("model_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setMyRequests(data);
  }, [user]);

  useEffect(() => {
    if (user) loadMyRequests();
  }, [user, loadMyRequests]);

  // Per-account drive done/hidden state stored in localStorage, keyed by account id + assigned_at
  const getDriveState = (accountId: string) => {
    try {
      const stored = JSON.parse(localStorage.getItem("drive_states") || "{}");
      return stored[accountId] || { done: false, hidden: false, memoSeen: false, assignedAt: null };
    } catch {return { done: false, hidden: false, memoSeen: false, assignedAt: null };}
  };
  const setDriveState = (accountId: string, update: {done?: boolean;hidden?: boolean;memoSeen?: boolean;assignedAt?: string | null;}) => {
    try {
      const stored = JSON.parse(localStorage.getItem("drive_states") || "{}");
      stored[accountId] = { ...getDriveState(accountId), ...update };
      localStorage.setItem("drive_states", JSON.stringify(stored));
    } catch {}
  };
  // Force re-render when drive state changes
  const [driveVersion, setDriveVersion] = useState(0);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showMemo, setShowMemo] = useState(false);
  const [showFrageMemo, setShowFrageMemo] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(() => {
    return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
  });

  // Listen for PWA install changes (e.g. user adds to homescreen while page is open)
  useEffect(() => {
    const mql = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setIsPwaInstalled(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Load profile data
  useEffect(() => {
    if (!user) return;
    supabase.
    from("profiles").
    select("telegram_id, group_name, offer").
    eq("user_id", user.id).
    maybeSingle().
    then(({ data }) => {
      if (data?.telegram_id) {
        setTelegramId(data.telegram_id);
        setTelegramSaved(true);
      }
      if (data?.group_name) {
        setGroupName(data.group_name);
        setGroupNameSaved(true);
      }
      if (data?.offer) setOffer(data.offer);
      setTelegramLoading(false);
    });

    // Load all assigned accounts
    supabase.
    from("accounts").
    select("id, account_email, account_password, account_domain, platform, assigned_at, drive_folder_id, model_language, model_active").
    eq("assigned_to", user.id).
    order("created_at", { ascending: true }).
    then(({ data }) => {
      if (data && data.length > 0) {
        // Reset drive state for re-assigned accounts (assigned_at changed)
        data.forEach((acc) => {
          const ds = getDriveState(acc.id);
          if (ds.assignedAt && ds.assignedAt !== acc.assigned_at) {
            // Account was re-assigned – reset to unchecked
            setDriveState(acc.id, { done: false, hidden: false, assignedAt: acc.assigned_at });
          } else if (!ds.assignedAt) {
            // First time seeing this account – store assigned_at
            setDriveState(acc.id, { assignedAt: acc.assigned_at });
          }
        });
        setAssignedAccounts(data);
      }
    });

    // Check if first login
    supabase.
    from("login_events").
    select("id", { count: "exact", head: true }).
    eq("user_id", user.id).
    then(({ count }) => {
      if (count !== null && count <= 1) {
        setIsFirstLogin(true);
      }
    });

    // Track PWA install status
    if (isPwaInstalled) {
      supabase.
      from("profiles").
      update({ pwa_installed: true } as any).
      eq("user_id", user.id).
      then();
    }
  }, [user, isPwaInstalled]);
  const saveTelegram = async () => {
    if (!user) return;
    const { error } = await supabase.
    from("profiles").
    update({ telegram_id: telegramId.trim() }).
    eq("user_id", user.id);
    if (error) {
      toast.error("Fehler beim Speichern");
      return;
    }
    setTelegramSaved(true);
    toast.success("Telegram-ID gespeichert!");
  };

  const saveGroupName = async () => {
    if (!user) return;
    const { error } = await supabase.
    from("profiles").
    update({ group_name: groupName.trim() }).
    eq("user_id", user.id);
    if (error) {
      toast.error("Fehler beim Speichern");
      return;
    }
    setGroupNameSaved(true);
    setEditingGroupName(false);
    toast.success("Gruppenname gespeichert!");
  };

  const [videoOpen, setVideoOpen] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [umsatz, setUmsatz] = useState(0);
  const [yesterdayRevenue, setYesterdayRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [hadConfetti, setHadConfetti] = useState(false);
  const [savingRevenue, setSavingRevenue] = useState(false);

  // Load revenue data
  useEffect(() => {
    if (!user) return;
    const loadRevenue = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const monthStart = today.slice(0, 8) + "01";

      // Load all revenue entries
      const { data } = await supabase.
      from("daily_revenue").
      select("date, amount").
      eq("user_id", user.id).
      order("date", { ascending: false });

      if (data) {
        const todayEntry = data.find((d) => d.date === today);
        if (todayEntry) setUmsatz(Number(todayEntry.amount));

        const yesterdayEntry = data.find((d) => d.date === yesterday);
        setYesterdayRevenue(yesterdayEntry ? Number(yesterdayEntry.amount) : 0);

        const monthly = data.
        filter((d) => d.date >= monthStart).
        reduce((sum, d) => sum + Number(d.amount), 0);
        setMonthlyRevenue(monthly);

        const total = data.reduce((sum, d) => sum + Number(d.amount), 0);
        setTotalRevenue(total);
      }
    };
    loadRevenue();
  }, [user]);

  // Save revenue on change (debounced)
  const saveRevenue = useCallback(async (amount: number) => {
    if (!user) return;
    setSavingRevenue(true);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.
    from("daily_revenue").
    upsert(
      { user_id: user.id, date: today, amount },
      { onConflict: "user_id,date" }
    );
    if (error) {
      toast.error("Fehler beim Speichern des Umsatzes");
    }
    setSavingRevenue(false);
  }, [user]);

  const handleUmsatzChange = useCallback((val: number) => {
    setUmsatz(val);
    // Recalculate monthly and total with new today value
    // We update optimistically
  }, []);

  // Debounce save
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      saveRevenue(umsatz);
    }, 800);
    return () => clearTimeout(timer);
  }, [umsatz, saveRevenue, user]);

  // Derived: total includes today's change
  const effectiveMonthlyRevenue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 8) + "01";
    // monthlyRevenue already includes old today value, so we just use the state
    // This is approximate; for accuracy we'd track separately but good enough
    return monthlyRevenue;
  }, [monthlyRevenue]);

  const isGold = umsatz >= GOLD_THRESHOLD;
  const rate = isGold ? GOLD_RATE : STARTER_RATE;
  const verdienst = umsatz * rate;
  const progressPct = Math.min(umsatz / GOLD_THRESHOLD * 100, 100);

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#c4973b", "#e8c96b", "#a07c2a", "#f5d98a"]
    });
  }, []);

  useEffect(() => {
    if (isGold && !hadConfetti) {
      setHadConfetti(true);
      fireConfetti();
    }
    if (!isGold) setHadConfetti(false);
  }, [isGold, hadConfetti, fireConfetti]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <HomescreenTutorial isFirstLogin={isFirstLogin} manualOpen={showTutorial} onManualClose={() => setShowTutorial(false)} />
      <PushNotificationDialog />
      <AccountMemoDialog open={showMemo} onOpenChange={setShowMemo} />
      <FrageMemoDialog open={showFrageMemo} onOpenChange={setShowFrageMemo} />
      {/* Header with Telegram + Umsatz inline */}
      <header className="header-gradient-border">
        <div className="container max-w-5xl mx-auto px-4 py-3 lg:px-8">
          {/* Desktop: single row */}
          <div className="hidden sm:flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-9 w-9 rounded-full shrink-0" />
            <div className="shrink-0">
              <h1 className="text-base lg:text-lg font-bold text-foreground leading-tight">Chatter Dashboard</h1>
            </div>
            <div className="h-8 w-px bg-border shrink-0" />
            <div className="flex items-center gap-2">
              {telegramSaved ?
              <>
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-sm text-foreground font-medium">{telegramId}</span>
                  <Button onClick={() => setTelegramSaved(false)} variant="ghost" size="sm" className="text-[10px] text-accent h-6 px-2">
                    Ändern
                  </Button>
                </> :

              <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Input value={telegramId} onChange={(e) => setTelegramId(e.target.value)} placeholder="Deine Telegram ID" className="h-7 text-xs w-44" />
                    <Button onClick={saveTelegram} size="sm" disabled={!telegramId.trim()} className="h-7 text-xs px-2.5"><Save className="h-3 w-3" /></Button>
                  </div>
                  <Dialog onOpenChange={(open) => {setVideoOpen(open);if (!open) setVideoLoaded(false);}}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors">
                        <HelpCircle className="h-3 w-3" />Wo finde ich meine Telegram ID?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="glass-card border-border sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Wo finde ich meine Telegram-ID?</DialogTitle>
                        <DialogDescription className="text-muted-foreground text-xs">Schau dir das kurze Video an, um deine Telegram-ID zu finden.</DialogDescription>
                      </DialogHeader>
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-secondary relative">
                        {!videoLoaded && <div className="absolute inset-0 flex items-center justify-center"><div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>}
                        {videoOpen && <iframe src="https://www.loom.com/embed/0582b0ea68b942728a535a98f990660b?autoplay=1" frameBorder="0" allowFullScreen allow="autoplay" className={`w-full h-full transition-opacity duration-300 ${videoLoaded ? "opacity-100" : "opacity-0"}`} title="Telegram ID finden" onLoad={() => setVideoLoaded(true)} />}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              }
            </div>
            <div className="h-8 w-px bg-border shrink-0" />
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-accent shrink-0" />
              {groupNameSaved && !editingGroupName ?
              <>
                  <span className="text-sm text-foreground font-medium">{groupName}</span>
                  <Button onClick={() => setEditingGroupName(true)} variant="ghost" size="sm" className="text-[10px] text-accent h-6 px-2">
                    <Pencil className="h-3 w-3" />
                  </Button>
                </> :

              <div className="flex items-center gap-1.5">
                  <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Gruppenname" className="h-7 text-xs w-36" />
                  <Button onClick={saveGroupName} size="sm" disabled={!groupName.trim()} className="h-7 text-xs px-2.5"><Save className="h-3 w-3" /></Button>
                </div>
              }
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-accent shrink-0" />
                <Input type="number" min={0} step={50} value={umsatz || ""} onChange={(e) => handleUmsatzChange(Number(e.target.value) || 0)} placeholder="Umsatz €" className="h-7 text-xs w-24 font-semibold" />
              </div>
              <Badge className={isGold ? "bg-accent text-accent-foreground gold-glow" : "bg-secondary text-secondary-foreground"}>
                <Award className="h-3 w-3 mr-1" />{isGold ? "Gold" : "Starter"}
              </Badge>
            </div>
          </div>

          {/* Mobile: stacked layout */}
          <div className="flex sm:hidden flex-col gap-3">
            {/* Row 1: Logo + Title + Badge */}
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="Logo" className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold text-foreground leading-tight">Chatter Dashboard</h1>
              </div>
              <Badge className={`shrink-0 text-[10px] ${isGold ? "bg-accent text-accent-foreground gold-glow" : "bg-secondary text-secondary-foreground"}`}>
                <Award className="h-3 w-3 mr-1" />{isGold ? "Gold" : "Starter"}
              </Badge>
            </div>

            {/* Row 2: Gruppenname */}
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-accent shrink-0" />
              {groupNameSaved && !editingGroupName ?
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-xs text-foreground font-medium truncate">{groupName}</span>
                  <Button onClick={() => setEditingGroupName(true)} variant="ghost" size="sm" className="text-[10px] text-accent h-5 px-1.5">
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div> :

              <div className="flex items-center gap-1 flex-1 min-w-0">
                  <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Gruppenname eingeben" className="h-7 text-xs flex-1 min-w-0" />
                  <Button onClick={saveGroupName} size="sm" disabled={!groupName.trim()} className="h-7 text-xs px-2"><Save className="h-3 w-3" /></Button>
                </div>
              }
            </div>

            {/* Row 3: Telegram + Umsatz side by side */}
            <div className="flex items-center gap-2">
              {telegramSaved ?
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="text-xs text-foreground font-medium truncate">{telegramId}</span>
                  <Button onClick={() => setTelegramSaved(false)} variant="ghost" size="sm" className="text-[10px] text-accent h-5 px-1.5">
                    Ändern
                  </Button>
                </div> :

              <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Input value={telegramId} onChange={(e) => setTelegramId(e.target.value)} placeholder="Telegram ID" className="h-7 text-xs flex-1 min-w-0" />
                    <Button onClick={saveTelegram} size="sm" disabled={!telegramId.trim()} className="h-7 text-xs px-2"><Save className="h-3 w-3" /></Button>
                  </div>
                  <Dialog onOpenChange={(open) => {setVideoOpen(open);if (!open) setVideoLoaded(false);}}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors">
                        <HelpCircle className="h-3 w-3" />Wo finde ich meine ID?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="glass-card border-border max-w-[calc(100vw-2rem)]">
                      <DialogHeader>
                        <DialogTitle className="text-foreground text-sm">Wo finde ich meine Telegram-ID?</DialogTitle>
                        <DialogDescription className="text-muted-foreground text-xs">Schau dir das kurze Video an.</DialogDescription>
                      </DialogHeader>
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-secondary relative">
                        {!videoLoaded && <div className="absolute inset-0 flex items-center justify-center"><div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>}
                        {videoOpen && <iframe src="https://www.loom.com/embed/0582b0ea68b942728a535a98f990660b?autoplay=1" frameBorder="0" allowFullScreen allow="autoplay" className={`w-full h-full transition-opacity duration-300 ${videoLoaded ? "opacity-100" : "opacity-0"}`} title="Telegram ID finden" onLoad={() => setVideoLoaded(true)} />}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              }
              <div className="shrink-0 flex items-center gap-1">
                <Zap className="h-3 w-3 text-accent" />
                <Input type="number" min={0} step={50} value={umsatz || ""} onChange={(e) => handleUmsatzChange(Number(e.target.value) || 0)} placeholder="€" className="h-7 text-xs w-20 font-semibold" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto p-4 lg:px-8 lg:py-8 space-y-5 lg:space-y-6">
        {/* Notification Banner */}
        <NotificationBanner />

        {/* Stats Cards */}
        {/* Mobile: 2-col grid with full-width status */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3 lg:hidden"
        >
          <motion.div variants={staggerItem} className="glass-card-subtle rounded-xl p-3 text-center card-hover-glow card-inner-glow group">
            <p className="text-[10px] text-muted-foreground mb-0.5">Umsatz gestern</p>
            <p className="text-xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105"><AnimatedValue value={yesterdayRevenue} /></p>
          </motion.div>
          <motion.div variants={staggerItem} className="glass-card-subtle rounded-xl p-3 text-center card-hover-glow card-inner-glow group">
            <p className="text-[10px] text-muted-foreground mb-0.5">Monatsumsatz</p>
            <p className="text-xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105"><AnimatedValue value={monthlyRevenue} /></p>
          </motion.div>
          <motion.div variants={staggerItem} className="glass-card-subtle rounded-xl p-3 text-center card-hover-glow card-inner-glow group">
            <p className="text-[10px] text-muted-foreground mb-0.5">Gesamtumsatz</p>
            <p className="text-xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105"><AnimatedValue value={totalRevenue} /></p>
          </motion.div>
          <motion.div variants={staggerItem} className="glass-card-subtle rounded-xl p-3 text-center card-hover-glow card-inner-glow group">
            <p className="text-[10px] text-muted-foreground mb-0.5">Verdienst diesen Monat</p>
            <p className="text-xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105"><AnimatedDecimalValue value={verdienst} /></p>
          </motion.div>
          <motion.div variants={staggerItem} className="glass-card-subtle rounded-xl p-3 text-center card-hover-glow card-inner-glow group">
            <p className="text-[10px] text-muted-foreground mb-0.5">Deine Rate</p>
            <p className="text-xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">{Math.round(rate * 100)}%</p>
          </motion.div>
          <DailyGoal />
          <motion.div variants={staggerItem} className="gold-gradient-border-animated rounded-xl p-3 text-center col-span-2 pulse-glow">
            <p className="text-[10px] text-muted-foreground mb-0.5">Status</p>
            <p className={`text-xl font-bold ${isGold ? "text-gold-gradient" : "text-muted-foreground"}`}>{isGold ? "Gold" : "Starter"}</p>
          </motion.div>
        </motion.div>
        {/* Desktop: Bento grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="hidden lg:grid grid-cols-4 gap-4"
        >
          <motion.div variants={staggerItem} className="glass-card-subtle rounded-xl p-5 text-center card-hover-glow card-inner-glow group">
            <p className="text-xs text-muted-foreground mb-0.5">Umsatz gestern</p>
            <p className="text-2xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105"><AnimatedValue value={yesterdayRevenue} /></p>
          </motion.div>
          <motion.div variants={staggerItem} className="col-span-2 glass-card-subtle rounded-xl p-5 text-center card-hover-glow card-inner-glow card-top-line group">
            <p className="text-xs text-muted-foreground mb-0.5">Monatsumsatz</p>
            <p className="text-3xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105"><AnimatedValue value={monthlyRevenue} /></p>
          </motion.div>
          <motion.div variants={staggerItem} className="glass-card-subtle rounded-xl p-5 text-center card-hover-glow card-inner-glow group">
            <p className="text-xs text-muted-foreground mb-0.5">Gesamtumsatz</p>
            <p className="text-2xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105"><AnimatedValue value={totalRevenue} /></p>
          </motion.div>
          <motion.div variants={staggerItem} className="col-span-2 glass-card-subtle rounded-xl p-5 text-center card-hover-glow card-inner-glow card-top-line group">
            <p className="text-xs text-muted-foreground mb-0.5">Verdienst diesen Monat</p>
            <p className="text-3xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105"><AnimatedDecimalValue value={verdienst} /></p>
          </motion.div>
          <motion.div variants={staggerItem} className="glass-card-subtle rounded-xl p-5 text-center card-hover-glow card-inner-glow group">
            <p className="text-xs text-muted-foreground mb-0.5">Deine Rate</p>
            <p className="text-2xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">{Math.round(rate * 100)}%</p>
          </motion.div>
          <DailyGoal />
          <motion.div variants={staggerItem} className="gold-gradient-border-animated rounded-xl p-5 text-center col-span-4 pulse-glow">
            <p className="text-xs text-muted-foreground mb-0.5">Status</p>
            <p className={`text-2xl font-bold ${isGold ? "text-gold-gradient" : "text-muted-foreground"}`}>{isGold ? "Gold" : "Starter"}</p>
          </motion.div>
        </motion.div>

        {/* PWA Install To-Do – between Status and Account, non-dismissable, auto-hides when installed */}
        {!isPwaInstalled &&
        <button
          onClick={() => setShowTutorial(true)}
          className="w-full flex items-center gap-3 glass-card-subtle rounded-xl p-3 lg:p-4 border border-accent/30 bg-accent/5 text-left cursor-pointer hover:bg-accent/10 hover:border-accent/50 transition-all">
          
            <Smartphone className="h-5 w-5 text-accent shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Aufgabe bevor du startest: Füge die App auf deinem Handy zum Homescreen hinzu.</p>
              <p className="text-xs text-accent mt-0.5 hover:underline">
                Wie geht das?
              </p>
            </div>
          </button>
        }

        {/* Frage stellen */}
        <button
          onClick={() => setShowFrageMemo(true)}
          className="w-full flex items-center gap-3 glass-card-subtle rounded-xl p-3 lg:p-4 border border-accent/30 bg-accent/5 text-left cursor-pointer hover:bg-accent/10 hover:border-accent/50 transition-all"
        >
          <HelpCircle className="h-5 w-5 text-accent shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Ich habe eine Frage</p>
            <p className="text-xs text-accent mt-0.5">Wo kann ich diese Frage stellen?</p>
          </div>
        </button>

        {/* Account-Daten */}
        <section className="glass-card-subtle rounded-xl overflow-hidden">
          <button
            onClick={() => setAccountsOpen(!accountsOpen)}
            className="w-full flex items-center justify-between p-4 lg:p-6 text-left">
            
            <h2 className="text-sm lg:text-base font-semibold text-foreground">
              {assignedAccounts.length > 1 ? "Deine Accounts" : "Dein Account"}
              {assignedAccounts.length > 0 &&
              <span className="ml-2 text-[10px] font-normal text-muted-foreground">({assignedAccounts.length})</span>
              }
            </h2>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${accountsOpen ? "rotate-180" : ""}`} />
          </button>
          {accountsOpen &&
          <div className="px-4 pb-4 lg:px-6 lg:pb-6 space-y-4">
              {assignedAccounts.length === 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Noch keine Accounts zugewiesen.</p>
              <button
                onClick={() => setAssignedAccounts([{
                  id: "demo-account",
                  account_email: "demo@example.com",
                  account_password: "demo-password-123",
                  account_domain: "demo-platform.com",
                  platform: "Demo",
                  assigned_at: new Date().toISOString(),
                  drive_folder_id: "1ABC_demoFolderId123",
                }])}
                className="flex items-center gap-2 w-full rounded-lg border border-dashed border-accent/40 bg-accent/5 px-3 py-2.5 text-xs font-medium text-accent hover:bg-accent/10 hover:border-accent/60 transition-all"
              >
                🧪 Demo: Account-Zuweisung simulieren
              </button>
            </div>
            ) :

            <div className="space-y-3">
                  {assignedAccounts.map((acc) => {
                const ds = getDriveState(acc.id);
                return (
                  <div key={acc.id} className={assignedAccounts.length > 1 ? "p-3 rounded-lg border border-border/50 bg-secondary/20" : ""}>
                      {assignedAccounts.length > 1 &&
                    <p className="text-[10px] text-muted-foreground font-medium mb-2">{acc.platform}</p>
                    }
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">E-Mail</p>
                          <button onClick={() => {if (acc.account_email) {navigator.clipboard.writeText(acc.account_email);toast.success("E-Mail kopiert!");}}} className="flex items-center gap-2 w-full rounded-lg border border-border/50 bg-secondary/40 px-3 py-2 hover:border-accent/50 hover:bg-secondary/60 hover:shadow-[0_0_12px_hsl(43_56%_52%_/_0.15)] active:scale-[0.97] transition-all cursor-pointer group" title="Klicken zum Kopieren">
                            <p className="text-xs lg:text-sm font-medium text-foreground truncate flex-1 text-left">{acc.account_email || "–"}</p>
                            {acc.account_email && <Copy className="h-3.5 w-3.5 text-accent shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />}
                          </button>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Passwort</p>
                          <button onClick={() => {if (acc.account_password) {navigator.clipboard.writeText(acc.account_password);toast.success("Passwort kopiert!");}}} className="flex items-center gap-2 w-full rounded-lg border border-border/50 bg-secondary/40 px-3 py-2 hover:border-accent/50 hover:bg-secondary/60 hover:shadow-[0_0_12px_hsl(43_56%_52%_/_0.15)] active:scale-[0.97] transition-all cursor-pointer group" title="Klicken zum Kopieren">
                            <p className="text-xs lg:text-sm font-medium text-foreground truncate flex-1 text-left">{acc.account_password || "–"}</p>
                            {acc.account_password && <Copy className="h-3.5 w-3.5 text-accent shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />}
                          </button>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Domain</p>
                          {acc.account_domain ?
                        <a href={`https://${acc.account_domain.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center rounded-lg border border-border/50 bg-secondary/40 px-3 py-2 text-xs lg:text-sm font-medium text-primary underline underline-offset-2 hover:border-accent/50 hover:bg-secondary/60 hover:shadow-[0_0_12px_hsl(43_56%_52%_/_0.15)] transition-all truncate">{acc.account_domain}</a> :

                        <div className="flex items-center rounded-lg border border-border/50 bg-secondary/40 px-3 py-2"><p className="text-xs lg:text-sm font-medium text-foreground truncate">–</p></div>
                        }
                        </div>
                      </div>
                      {/* Memo button – only if never seen globally */}
                      {!localStorage.getItem("account_memo_seen") &&
                    <button
                      onClick={() => {setShowMemo(true);localStorage.setItem("account_memo_seen", "true");setDriveVersion((p) => p + 1);}}
                      className="mt-3 flex items-center gap-2.5 w-full rounded-xl border border-accent/20 bg-accent/5 px-3.5 py-2.5 hover:bg-accent/10 active:scale-[0.98] transition-all cursor-pointer group">
                      
                          <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
                            <Mic className="h-3.5 w-3.5 text-accent" />
                          </div>
                          <span className="text-xs font-medium text-foreground">Kann ich direkt starten?</span>
                          <span className="ml-auto text-[10px] text-accent opacity-70 group-hover:opacity-100 transition-opacity">Anhören</span>
                        </button>
                    }
                      {!ds.hidden &&
                    <div className="mt-3 border-t border-border/30 pt-3">
                          {acc.drive_folder_id ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <button
                                  className="flex items-center gap-2 w-full rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5 text-xs font-medium text-accent hover:bg-accent/10 hover:border-accent/50 hover:shadow-[0_0_12px_hsl(43_56%_52%_/_0.15)] transition-all cursor-pointer"
                                >
                                  <span className="flex flex-col items-start gap-0.5">
                                    <span>📂 Google Drive öffnen</span>
                                    <span className="text-[10px] font-normal text-muted-foreground">Wozu brauche ich den Google Drive?</span>
                                  </span>
                                  <ExternalLink className="h-3 w-3 ml-auto opacity-70 shrink-0" />
                                </button>
                              </DialogTrigger>
                              <DialogContent className="glass-card border-border sm:max-w-md max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="text-foreground flex items-center gap-2 text-base">
                                    📂 Wozu der Google Drive?
                                  </DialogTitle>
                                  <DialogDescription className="sr-only">Informationen zum Google Drive Ordner</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                                    <p>
                                      Im Google Drive findest du <span className="text-foreground font-medium">zusätzlichen Content</span>, der zum Teil noch nicht in der Cloud verfügbar ist.
                                    </p>
                                    <p>
                                      Dort wird regelmäßig <span className="text-foreground font-medium">neuer Content hochgeladen</span> – außerdem findest du dort Content aus <span className="text-foreground font-medium">Model-Anfragen</span>, den du selbstständig hochladen kannst.
                                    </p>
                                  </div>
                                  <div className="space-y-3 border-t border-border/30 pt-4">
                                    <h3 className="text-sm font-semibold text-foreground">📤 So lädst du Content hoch</h3>
                                    <div className="rounded-xl border border-border/50 bg-secondary/30 overflow-hidden aspect-video flex items-center justify-center">
                                      <div className="text-center space-y-2 p-4">
                                        <div className="w-12 h-12 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
                                          <span className="text-2xl">🎬</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Tutorial-Video kommt bald</p>
                                      </div>
                                    </div>
                                  </div>
                                  <a
                                    href={`https://drive.google.com/drive/folders/${acc.drive_folder_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent hover:bg-accent/20 hover:border-accent/50 hover:shadow-[0_0_16px_hsl(43_56%_52%_/_0.2)] transition-all"
                                  >
                                    📂 Google Drive öffnen
                                    <ExternalLink className="h-4 w-4 opacity-70" />
                                  </a>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                          <div className="flex items-start gap-3">
                            <Checkbox checked={ds.done} onCheckedChange={(v) => {setDriveState(acc.id, { done: !!v });setDriveVersion((p) => p + 1);}} className="mt-0.5 shrink-0 border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground" />
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className={cn("text-xs font-semibold text-foreground", ds.done && "line-through text-muted-foreground")}>📂 Google Drive Zugang anfordern</p>
                                {ds.done && <button onClick={() => {setDriveState(acc.id, { hidden: true });setDriveVersion((p) => p + 1);}} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">Ausblenden</button>}
                              </div>
                              {!ds.done &&
                          <>
                                  <p className="text-[10px] text-muted-foreground">Schick diese Nachricht in die WhatsApp-Gruppe:</p>
                                  <button onClick={() => {const msg = `Hey, könnt ihr mich bitte zum Google Drive hinzufügen? Meine E-Mail: ${user?.email || "[DEINE E-MAIL]"} | Model-Account: ${acc.account_email || "[ACCOUNT E-MAIL]"} – Danke! 🙏`;navigator.clipboard.writeText(msg);toast.success("Nachricht kopiert – WhatsApp öffnet sich…");setTimeout(() => {window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");}, 400);}} className="flex items-center gap-2 w-full rounded-lg border border-border/50 bg-secondary/40 px-3 py-2 hover:border-accent/50 hover:bg-secondary/60 active:scale-[0.98] transition-all cursor-pointer group text-left" title="Kopieren & WhatsApp öffnen">
                                    <p className="text-[11px] text-foreground leading-relaxed flex-1 min-w-0">Hey, könnt ihr mich bitte zum Google Drive hinzufügen? Meine E-Mail: <span className="font-semibold text-accent">{user?.email || "[DEINE E-MAIL]"}</span> | Model-Account: <span className="font-semibold text-accent">{acc.account_email || "[ACCOUNT E-MAIL]"}</span> – Danke! 🙏</p>
                                    <Copy className="h-3.5 w-3.5 text-accent shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                </>
                          }
                            </div>
                          </div>
                          )}
                        </div>
                    }
                    </div>);

              })}
                </div>
            }
            </div>
          }

          {/* Demo Toggle für Model aktiv/inaktiv */}
          <div className="border-t border-border/30 px-4 py-2 lg:px-6 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">🧪 Demo:</span>
            <Button
              variant={demoModelInactive ? "destructive" : "outline"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setDemoModelInactive(!demoModelInactive)}
            >
              {demoModelInactive ? "Model inaktiv" : "Model aktiv"}
            </Button>
          </div>

          {/* Anfrage an das Model – oder Inaktiv-Hinweis */}
          <div className="border-t border-border/30">
            {(demoModelInactive || assignedAccounts.some(acc => acc.model_active === false)) ? (
              <>
                <div className="flex items-center gap-3 px-4 py-4 lg:px-6 lg:py-5">
                  <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-5 w-5 text-destructive/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-muted-foreground">Dein Model kann momentan keine Anfragen entgegennehmen</p>
                    <button
                      onClick={() => setModelInactiveInfoOpen(true)}
                      className="text-[11px] text-accent/70 hover:text-accent underline underline-offset-2 mt-0.5 transition-colors"
                    >
                      Wieso ist das so?
                    </button>
                  </div>
                </div>
                <Dialog open={modelInactiveInfoOpen} onOpenChange={setModelInactiveInfoOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Model momentan inaktiv</DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        Dein Model hat uns mitgeteilt, dass sie aktuell keine neuen Anfragen entgegennehmen kann. Das ist der letzte Stand, den wir haben.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                      <p className="text-sm text-foreground">
                        💰 <strong>Trotzdem kann gutes Geld verdient werden!</strong> Es ist bereits genug Content auf dem Account vorhanden, mit dem du weiterarbeiten kannst. Nutze den vorhandenen Content, um Umsatz zu machen.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <ModelRequestDialog
                onSubmitted={loadMyRequests}
                editData={editRequest}
                onEditClear={() => setEditRequest(null)}
                modelLanguage={assignedAccounts.length > 0 ? (assignedAccounts[0] as any).model_language || "de" : "de"}
              />
            )}
          </div>

          {/* Bisherige Anfragen – einklappbar */}
          {myRequests.length > 0 && (() => {
            // Unseen = requests with status !== pending OR with admin_comment, that user hasn't seen yet
            const unseenCount = myRequests.filter(r =>
              (r.status !== "pending" || r.admin_comment) && !seenRequestIds.has(r.id + "_" + r.status + "_" + (r.admin_comment || ""))
            ).length;

            const markAllSeen = () => {
              const newSeen = new Set(seenRequestIds);
              myRequests.forEach(r => {
                newSeen.add(r.id + "_" + r.status + "_" + (r.admin_comment || ""));
              });
              setSeenRequestIds(newSeen);
              localStorage.setItem("seen_request_updates", JSON.stringify([...newSeen]));
            };

            return (
              <div className="border-t border-border/30">
                <button
                  onClick={() => {
                    const newOpen = !requestsOpen;
                    setRequestsOpen(newOpen);
                    if (newOpen) markAllSeen();
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 lg:px-6 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">Deine Anfragen ({myRequests.length})</span>
                    {unseenCount > 0 && (
                      <span className="h-5 min-w-5 px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center animate-in zoom-in duration-200">
                        {unseenCount}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${requestsOpen ? "rotate-180" : ""}`} />
                </button>
                {requestsOpen && (
                  <div className="px-4 pb-4 lg:px-6 lg:pb-6 space-y-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="flex items-center gap-2 text-[11px] text-accent hover:underline mb-1 cursor-pointer">
                          <HelpCircle className="h-3.5 w-3.5" />
                          Wie lange dauert es, bis eine Anfrage bearbeitet wird?
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm bg-background border-border">
                        <DialogHeader>
                          <DialogTitle className="text-foreground text-sm">⏳ Bearbeitungsdauer</DialogTitle>
                          <DialogDescription className="text-muted-foreground text-xs leading-relaxed pt-2">
                            In der Regel werden Anfragen innerhalb von <strong className="text-foreground">24 bis 48 Stunden</strong> bearbeitet.
                            <br /><br />
                            In Sonderfällen – zum Beispiel wenn das Model gesundheitlich angeschlagen ist – kann es auch länger dauern.
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                    {[...myRequests].sort((a, b) => a.status === "rejected" && b.status !== "rejected" ? 1 : b.status === "rejected" && a.status !== "rejected" ? -1 : 0).map((req) => (
                      <div key={req.id} className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-foreground">{req.model_name}</span>
                            {(req as any).customer_name && (
                              <span className="text-[10px] text-muted-foreground">Kunde: {(req as any).customer_name}</span>
                            )}
                          </div>
                          <Badge variant={req.status === "accepted" ? "default" : req.status === "rejected" ? "destructive" : req.status === "in_progress" ? "secondary" : "secondary"} className="text-[10px]">
                            {req.status === "pending" ? "⏳ Ausstehend" : req.status === "accepted" ? "✅ Angenommen" : req.status === "in_progress" ? "⏳ Wird bearbeitet" : "❌ Abgelehnt"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{req.description}</p>
                        {req.admin_comment && (
                          <div className="flex items-start gap-1.5 rounded-md bg-accent/10 border border-accent/20 px-2.5 py-2 mt-1">
                            <MessageSquare className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                            <p className="text-[11px] text-foreground leading-relaxed">{req.admin_comment}</p>
                          </div>
                        )}
                        {/* Content Link with Tutorial Dialog */}
                        {(req as any).content_link && (req.status === "accepted" || req.status === "in_progress") && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <button className="flex items-center gap-1.5 rounded-md bg-accent/10 border border-accent/20 px-2.5 py-2 mt-1 hover:bg-accent/15 transition-colors w-full text-left">
                                <ExternalLink className="h-3 w-3 text-accent shrink-0" />
                                <span className="text-[11px] text-accent font-medium">Link zum angefragten Content</span>
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm">
                              <DialogHeader>
                                <DialogTitle className="text-sm">Content herunterladen & hochladen</DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                  Schau dir kurz das Tutorial an, wie du den Content runterlädst und dann selbst hochlädst.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                {/* Tutorial Video */}
                                <div className="rounded-lg overflow-hidden border border-border/50 aspect-video bg-secondary/30">
                                  <iframe
                                    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                                    title="Content Tutorial"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full"
                                  />
                                </div>

                                {/* Content Link */}
                                <a
                                  href={(req as any).content_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClickCapture={(e) => e.stopPropagation()}
                                  onPointerDownCapture={(e) => e.stopPropagation()}
                                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-accent text-accent-foreground px-4 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Content öffnen
                                </a>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {/* Bearbeiten Button – nur bei Admin-Kommentar */}
                        {req.admin_comment && req.status !== "rejected" && (
                          <button
                            onClick={() => setEditRequest({
                              id: req.id,
                              model_name: req.model_name,
                              request_type: req.request_type as "individual" | "general",
                              price: req.price,
                              description: req.description,
                              customer_name: (req as any).customer_name,
                            })}
                            className="flex items-center gap-1.5 text-[10px] text-accent hover:text-accent/80 transition-colors mt-1 cursor-pointer"
                          >
                            <Pencil className="h-3 w-3" />
                            Anfrage bearbeiten
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </section>

        {/* MassDM Generator */}
        <MassDmGenerator />

        {/* Tägliche Aufgaben */}
        <DailyChecklist />

        {/* Bonus Model - alles in einer Karte */}
        <section className="glass-card rounded-xl p-4 lg:p-6 space-y-4 relative overflow-hidden">
          {/* Animated gold shimmer sweep */}
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
          >
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, hsl(43 56% 52%) 50%, transparent 60%)',
                backgroundSize: '200% 100%',
                animation: 'bonus-sweep 14s ease-in-out infinite',
              }}
            />
          </div>
          {/* Animated Header */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Crown className="h-4 w-4 lg:h-5 lg:w-5 text-accent" />
              </motion.div>
              <h2 className="text-sm lg:text-base font-bold text-gold-gradient-shimmer">Bonus-Modell</h2>
            </div>
            <div className="mt-2 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
          </div>

          <motion.div
            className="space-y-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {/* Account Upgrade - Tier 1 */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
              className="relative rounded-xl overflow-hidden bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30 p-4 lg:p-5 space-y-4 transition-transform duration-200 hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-lg">⬆</span>
                  </div>
                  <div>
                    <p className="font-bold text-accent text-sm lg:text-base">Account Upgrade</p>
                    <p className="text-[10px] lg:text-xs text-muted-foreground">7 Tage in Folge mind. 30€ Umsatz</p>
                  </div>
                </div>
                <span className="font-bold text-accent text-sm lg:text-base">Besserer Account</span>
              </div>
              <StreakTracker dailyRevenue={umsatz} />
            </motion.div>

            {/* Gold - Tier 2 with progress bar */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
              className={cn(
                "relative rounded-xl overflow-hidden border p-4 lg:p-5 space-y-3 transition-all duration-300",
                isGold
                  ? "gold-gradient-border-animated pulse-glow bg-accent/10"
                  : "border-border bg-secondary/30 hover:scale-[1.01] hover:border-border/80"
              )}
            >
              {isGold && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", isGold ? "bg-accent/20 gold-glow" : "bg-secondary")}>
                    <Award className={cn("h-5 w-5", isGold ? "text-accent" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <p className={cn("font-bold text-sm lg:text-base", isGold ? "text-gold-gradient-shimmer" : "text-muted-foreground")}>Gold-Status</p>
                    <p className="text-[10px] lg:text-xs text-muted-foreground">Ab 3.000€ Monatsumsatz</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn("font-bold text-lg lg:text-xl", isGold ? "text-gold-gradient" : "text-muted-foreground")}>25%</span>
                  {isGold && (
                    <motion.p
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-[10px] text-accent font-semibold gold-glow rounded-full px-2 py-0.5 bg-accent/10 mt-1 inline-block"
                    >
                      🏆 Gold aktiv
                    </motion.p>
                  )}
                </div>
              </div>
              {/* Gold progress bar */}
              <div className="space-y-1.5">
                <Progress value={progressPct} className={cn("h-2.5 [&>div]:bg-accent shimmer-bar", isGold && "[&>div]:bg-gradient-to-r [&>div]:from-accent [&>div]:to-gold-light")} />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <motion.span
                    key={umsatz}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    {umsatz.toLocaleString("de-DE")}€
                  </motion.span>
                  <span>
                    {isGold
                      ? "Gold-Status aktiv 🎉"
                      : `Noch ${(GOLD_THRESHOLD - umsatz).toLocaleString("de-DE")}€`}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Starter - Tier 3 */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
              className={cn(
                "relative rounded-xl overflow-hidden border p-4 lg:p-5 transition-all duration-200",
                !isGold ? "border-border bg-secondary/50" : "border-border/50 bg-secondary/20 hover:scale-[1.01]"
              )}
            >
              {!isGold && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", !isGold ? "bg-secondary" : "bg-secondary/50")}>
                    <Zap className={cn("h-5 w-5", !isGold ? "text-foreground" : "text-muted-foreground/50")} />
                  </div>
                  <div>
                    <p className={cn("font-bold text-sm lg:text-base", !isGold ? "text-foreground" : "text-muted-foreground/50")}>Starter</p>
                    <p className="text-[10px] lg:text-xs text-muted-foreground">0€ – 2.999€ Umsatz</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn("font-bold text-lg lg:text-xl", !isGold ? "text-foreground" : "text-muted-foreground/50")}>20%</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <p className="text-[10px] lg:text-xs text-muted-foreground">
            Ab 3.000€ Monatsumsatz gilt die 25%-Rate für diesen Monat auf den <strong className="text-foreground">gesamten Betrag</strong>.
          </p>
          <p className="text-[10px] lg:text-xs text-muted-foreground">
            7 Tage in Folge mind. 30€ = <strong className="text-foreground">Upgrade auf besseren Account</strong>.
          </p>
        </section>

        {/* Billing countdown + Invoice button */}
        <DashboardBillingInfo onNavigate={() => navigate("/rechnung")} groupName={groupName} />
      </main>

      <DashboardChat externalOpen={chatOpen} onExternalOpenChange={setChatOpen} />
    </div>);}

const REFERRAL_LINKEDIN_URL = "LINKEDIN_URL";

function DashboardBillingInfo({ onNavigate, groupName }: {onNavigate: () => void; groupName: string;}) {
  const now = new Date();
  const deadline = endOfMonth(addMonths(now, 1));
  const daysLeft = differenceInDays(deadline, now);
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalDays = differenceInDays(deadline, startDate);
  const progressPct = Math.round((totalDays - daysLeft) / totalDays * 100);

  const referralText = `Hey! Ich arbeite als Chatter und verdiene damit richtig gutes Geld. Wenn du Lust hast, bewirb dich hier!\n\nWichtig: Gib bei der Bewerbung meinen Gruppennamen „${groupName}" an – das ist nötig, damit es zugeordnet werden kann!\n\nLink zum Bewerben: ${REFERRAL_LINKEDIN_URL}`;

  const copyReferralText = async () => {
    try {
      await navigator.clipboard.writeText(referralText);
      toast.success("Text kopiert!");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  return (
    <div className="space-y-3">
      <div className="glass-card-subtle rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold text-foreground">Abrechnungszeitraum</span>
          </div>
          <BillingAudioDialog />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground">Startdatum</p>
            <p className="text-xs font-semibold text-foreground">{format(startDate, "dd. MMM yyyy", { locale: de })}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground">Nächste Abrechnung</p>
            <p className="text-xs font-semibold text-gold-gradient">{format(deadline, "dd. MMM yyyy", { locale: de })}</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Noch <span className="text-accent font-semibold">{daysLeft}</span> Tage</span>
            <span>{format(deadline, "dd.MM.yyyy")}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden shimmer-bar">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <Button
        onClick={onNavigate}
        className="w-full h-11 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:brightness-110 transition-all">
        <FileText className="mr-2 h-4 w-4" />
        Rechnung erstellen
      </Button>

      {/* Referral Card */}
      <Dialog>
        <DialogTrigger asChild>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card-subtle rounded-xl p-4 cursor-pointer group hover:gold-border-glow transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                <Gift className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Empfehle deine Freunde</p>
                <p className="text-[10px] text-muted-foreground">Verdiene 1% von dem, was sie verdienen – <span className="text-accent font-semibold">Lifetime</span></p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </div>
          </motion.div>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Gift className="h-4 w-4 text-accent" />
              Empfehlungsprogramm
            </DialogTitle>
            <DialogDescription className="text-xs">
              Verdiene passiv mit – für jeden Freund, den du bringst.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Explanation */}
            <div className="glass-card-subtle rounded-lg p-3 space-y-2">
              <p className="text-xs text-foreground font-medium">So funktioniert's:</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Für jeden Freund, den du zu uns bringst, erhältst du <span className="text-accent font-semibold">1% von dessen Verdienst – lebenslang</span>. 
                Je mehr Freunde du empfiehlst, desto mehr verdienst du passiv dazu.
              </p>
            </div>

            {/* Important note */}
            <div className="glass-card-subtle rounded-lg p-3 space-y-2 border border-accent/20">
              <p className="text-xs text-foreground font-medium flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-accent" />
                Wichtig
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Dein Freund muss im Bewerbungsprozess deinen <span className="text-foreground font-semibold">Gruppennamen</span> angeben, damit wir die Empfehlung zuordnen können.
              </p>
              {groupName && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">Dein Gruppenname:</span>
                  <Badge variant="outline" className="text-[11px] border-accent/30 text-accent font-semibold">
                    {groupName}
                  </Badge>
                </div>
              )}
            </div>

            {/* LinkedIn Link – copy */}
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(REFERRAL_LINKEDIN_URL);
                  toast.success("Bewerbungslink kopiert!");
                } catch { toast.error("Kopieren fehlgeschlagen"); }
              }}
              className="w-full h-10 text-xs border-accent/30 hover:bg-accent/10 hover:text-accent"
            >
              <Copy className="mr-2 h-3.5 w-3.5" />
              Bewerbungslink kopieren
            </Button>

            {/* Copyable text */}
            <div className="space-y-2">
              <p className="text-xs text-foreground font-medium">Nachricht zum Teilen:</p>
              <div className="glass-card-subtle rounded-lg p-3 space-y-2">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Hey! Ich arbeite als Chatter und verdiene damit richtig gutes Geld. Wenn du Lust hast, bewirb dich hier!
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Wichtig: Gib bei der Bewerbung meinen Gruppennamen „<span className="text-accent font-semibold">{groupName || "—"}</span>" an – das ist nötig, damit es zugeordnet werden kann!
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Link zum Bewerben:{" "}
                  <span className="text-accent font-semibold break-all">{REFERRAL_LINKEDIN_URL}</span>
                </p>
              </div>
              <Button
                onClick={copyReferralText}
                variant="outline"
                className="w-full h-9 text-xs border-accent/30 hover:bg-accent/10 hover:text-accent"
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Nachricht kopieren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>);
}