import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Save,
  CheckCircle2,
  Award,
  Zap,
  HelpCircle,
  FileText,
  Clock,
  Users,
  Pencil,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Smartphone,
  MessageSquare,
  ExternalLink,
  Gift,
  Crown,
  Diamond,
  Medal,
  Eye,
  EyeOff,
  Check,
  Trophy,
} from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { isDemoMode } from "@/lib/demoMode";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import DashboardChat from "@/components/DashboardChat";
import BillingAudioDialog from "@/components/BillingAudioDialog";
import DailyChecklist from "@/components/DailyChecklist";
import MassDmGenerator from "@/components/MassDmGenerator";
import DailyGoal from "@/components/DailyGoal";
import StreakTracker from "@/components/StreakTracker";
import MonthlyStreakTracker from "@/components/MonthlyStreakTracker";
import NotificationBanner from "@/components/NotificationBanner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import GoldParticles from "@/components/GoldParticles";
import LiveActivityTicker from "@/components/LiveActivityTicker";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { format, endOfMonth, addMonths, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import HomescreenTutorial from "@/components/HomescreenTutorial";
import PushNotificationDialog from "@/components/PushNotificationDialog";
import LootBoxReward from "@/components/LootBoxReward";
import FrageMemoDialog from "@/components/FrageMemoDialog";
import ModelRequestDialog, { EditRequestData } from "@/components/ModelRequestDialog";
import RevenueChart from "@/components/RevenueChart";
import MonthSummaryWidget from "@/components/MonthSummaryWidget";
import QuickActionBar from "@/components/QuickActionBar";
import InspirationLibrary from "@/components/InspirationLibrary";
import ThirtyDayChallenge from "@/components/ThirtyDayChallenge";
import DashboardOnboarding from "@/components/DashboardOnboarding";
import { highlightSection } from "@/lib/sectionHighlight";

// Streak helper (mirrors StreakTracker logic)
function getStreakDays(): number {
  try {
    const raw = localStorage.getItem("streak_data");
    if (!raw) return 0;
    const { dates } = JSON.parse(raw) as { dates: string[] };
    if (!dates || dates.length === 0) return 0;
    const sorted = [...new Set(dates)].sort().reverse();
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
    let count = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (diff === 1) count++;
      else break;
    }
    return count;
  } catch {
    return 0;
  }
}

const BONUS_TIERS = [
  { name: "Starter", emoji: "⚡", min: 0, max: 499, rate: 20 },
  { name: "Bronze", emoji: "🥉", min: 500, max: 999, rate: 21 },
  { name: "Silber", emoji: "🥈", min: 1000, max: 1499, rate: 22 },
  { name: "Gold", emoji: "🏆", min: 1500, max: 1999, rate: 23 },
  { name: "Platin", emoji: "💠", min: 2000, max: 2999, rate: 24 },
  { name: "Elite", emoji: "💎", min: 3000, max: 49999, rate: 25 },
  { name: "Titan", emoji: "🔱", min: 50000, max: Infinity, rate: 35 },
] as const;

function getCurrentTier(monthlyRevenue: number) {
  return BONUS_TIERS.find((t) => monthlyRevenue >= t.min && monthlyRevenue <= t.max) || BONUS_TIERS[0];
}

function getNextTier(monthlyRevenue: number) {
  const currentIdx = BONUS_TIERS.findIndex((t) => monthlyRevenue >= t.min && monthlyRevenue <= t.max);
  if (currentIdx < BONUS_TIERS.length - 1) return BONUS_TIERS[currentIdx + 1];
  return null;
}

// Animated counter hook
function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    if (start === target) {
      setValue(target);
      return;
    }
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
  return (
    <span className={className}>
      {animated.toLocaleString("de-DE")}
      {suffix}
    </span>
  );
}

function AnimatedDecimalValue({
  value,
  suffix = "€",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const animated = useAnimatedCounter(Math.round(value * 100));
  const display = (animated / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
}

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const platform = searchParams.get("platform") || "Brezzels";

  const { user } = useAuth();

  const [telegramId, setTelegramId] = useState("");
  const [telegramSaved, setTelegramSaved] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [telegramHelpOpen, setTelegramHelpOpen] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [groupNameSaved, setGroupNameSaved] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);

  const [offer, setOffer] = useState("");
  const [assignedAccounts, setAssignedAccounts] = useState<
    {
      id: string;
      account_email: string;
      account_password: string;
      account_domain: string;
      platform: string;
      assigned_at: string | null;
      drive_folder_id?: string;
      model_language?: string;
      model_active?: boolean;
      model_id?: string | null;
    }[]
  >([]);
  const [modelInactiveInfoOpen, setModelInactiveInfoOpen] = useState(false);
  const [demoModelInactive, setDemoModelInactive] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<any>(null);
  const [seenRequestIds, setSeenRequestIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("seen_request_updates");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
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

  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFrageMemo, setShowFrageMemo] = useState(false);
  const [homescreenDismissed, setHomescreenDismissed] = useState(() => {
    // If PWA is already installed or tutorial was seen, no need to wait
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    const seen = localStorage.getItem("homescreen_tutorial_seen");
    return isStandalone || !!seen;
  });
  const [isPwaInstalled, setIsPwaInstalled] = useState(() => {
    return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
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
    supabase
      .from("profiles")
      .select("telegram_id, group_name, offer")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
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
    supabase
      .from("accounts")
      .select(
        "id, account_email, account_password, account_domain, platform, assigned_at, drive_folder_id, model_language, model_active, model_id",
      )
      .eq("assigned_to", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setAssignedAccounts(data || []);
      });

    // Check if first login
    supabase
      .from("login_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        if (count !== null && count <= 1) {
          setIsFirstLogin(true);
        }
      });

    // Track PWA install status
    if (isPwaInstalled) {
      supabase
        .from("profiles")
        .update({ pwa_installed: true } as any)
        .eq("user_id", user.id)
        .then();
    }
  }, [user, isPwaInstalled]);
  const saveTelegram = async () => {
    if (!user) return;
    const trimmed = telegramId.trim();
    const digitCount = (trimmed.match(/\d/g) || []).length;
    if (digitCount < 7) {
      setTelegramHelpOpen(true);
      return;
    }
    const { error } = await supabase.from("profiles").update({ telegram_id: trimmed }).eq("user_id", user.id);
    if (error) {
      toast.error("Fehler beim Speichern");
      return;
    }
    setTelegramSaved(true);
    toast.success("Telegram-ID gespeichert!");
  };

  const saveGroupName = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ group_name: groupName.trim() }).eq("user_id", user.id);
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
  const { playCoinSound, playLevelUpSound } = useSoundEffects();
  const prevTierRef = useRef<string | null>(null);

  // Load revenue data
  useEffect(() => {
    if (!user) return;
    const loadRevenue = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const monthStart = today.slice(0, 8) + "01";

      // Load all revenue entries
      const { data } = await supabase
        .from("daily_revenue")
        .select("date, amount")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (data) {
        const todayEntry = data.find((d) => d.date === today);
        if (todayEntry) setUmsatz(Number(todayEntry.amount));

        const yesterdayEntry = data.find((d) => d.date === yesterday);
        setYesterdayRevenue(yesterdayEntry ? Number(yesterdayEntry.amount) : 0);

        const monthly = data.filter((d) => d.date >= monthStart).reduce((sum, d) => sum + Number(d.amount), 0);
        setMonthlyRevenue(monthly);

        const total = data.reduce((sum, d) => sum + Number(d.amount), 0);
        setTotalRevenue(total);
      }
    };
    loadRevenue();
  }, [user]);

  // // Save revenue on change (debounced)
  // const saveRevenue = useCallback(async (amount: number) => {
  //   if (!user) return;
  //   setSavingRevenue(true);
  //   const today = new Date().toISOString().slice(0, 10);
  //   console.log(today, amount)
  //   // const { error } = await supabase.
  //   // from("daily_revenue").
  //   // upsert(
  //   //   { user_id: user.id, date: today, amount },
  //   //   { onConflict: "user_id,date" }
  //   // );
  //   // if (error) {
  //   //   toast.error("Fehler beim Speichern des Umsatzes");
  //   // }
  //   playCoinSound();
  //   setSavingRevenue(false);
  // }, [user, playCoinSound]);

  // const handleUmsatzChange = useCallback((val: number) => {
  //   setUmsatz(val);
  //   // Recalculate monthly and total with new today value
  //   // We update optimistically
  // }, []);

  // // Debounce save
  // useEffect(() => {
  //   if (!user) return;
  //   const timer = setTimeout(() => {
  //     saveRevenue(umsatz);
  //   }, 800);
  //   return () => clearTimeout(timer);
  // }, [umsatz, saveRevenue, user]);

  // Derived: total includes today's change
  const effectiveMonthlyRevenue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 8) + "01";
    // monthlyRevenue already includes old today value, so we just use the state
    // This is approximate; for accuracy we'd track separately but good enough
    return monthlyRevenue;
  }, [monthlyRevenue]);

  const currentTier = getCurrentTier(monthlyRevenue);
  const nextTier = getNextTier(monthlyRevenue);
  const rate = currentTier.rate / 100;
  const verdienst = monthlyRevenue * rate;
  const isTopTier = !nextTier;
  const progressToNext = nextTier
    ? Math.min(((monthlyRevenue - currentTier.min) / (nextTier.min - currentTier.min)) * 100, 100)
    : 100;

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#c4973b", "#e8c96b", "#a07c2a", "#f5d98a"],
    });
  }, []);

  useEffect(() => {
    if (isTopTier && !hadConfetti) {
      setHadConfetti(true);
      fireConfetti();
    }
    if (!isTopTier) setHadConfetti(false);
  }, [isTopTier, hadConfetti, fireConfetti]);

  // Tier change sound
  useEffect(() => {
    if (prevTierRef.current && prevTierRef.current !== currentTier.name) {
      playLevelUpSound();
    }
    prevTierRef.current = currentTier.name;
  }, [currentTier.name, playLevelUpSound]);

  // Streak for hot-streak effect
  const streakDays = useMemo(() => getStreakDays(), []);
  const hotStreakClass =
    streakDays >= 7
      ? "hot-streak-7"
      : streakDays >= 6
        ? "hot-streak-6"
        : streakDays >= 5
          ? "hot-streak-5"
          : streakDays >= 4
            ? "hot-streak-4"
            : streakDays >= 3
              ? "hot-streak-3"
              : "";

  return (
    <div className="min-h-screen pb-24">
      <GoldParticles spawnRate={0.25} maxParticles={20} baseOpacity={0.2} />
      <HomescreenTutorial
        isFirstLogin={isFirstLogin}
        manualOpen={showTutorial}
        onManualClose={() => {
          setShowTutorial(false);
          setHomescreenDismissed(true);
        }}
        onDismiss={() => setHomescreenDismissed(true)}
      />
      <DashboardOnboarding
        isFirstLogin={isFirstLogin}
        manualOpen={showOnboarding}
        onManualClose={() => setShowOnboarding(false)}
        waitForDismiss={!homescreenDismissed}
      />
      <PushNotificationDialog />
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
              {telegramSaved ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-sm text-foreground font-medium">{telegramId}</span>
                  <Button
                    onClick={() => setTelegramSaved(false)}
                    variant="ghost"
                    size="sm"
                    className="text-[10px] text-accent h-6 px-2"
                  >
                    Ändern
                  </Button>
                </>
              ) : (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="input-gold-shimmer rounded-lg">
                      <Input
                        value={telegramId}
                        onChange={(e) => setTelegramId(e.target.value)}
                        placeholder="Deine Telegram ID"
                        className="h-7 text-xs w-44 border-transparent"
                      />
                    </div>
                    <Button
                      onClick={saveTelegram}
                      size="sm"
                      disabled={!telegramId.trim()}
                      className="h-7 text-xs px-2.5"
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                  <Dialog
                    onOpenChange={(open) => {
                      setVideoOpen(open);
                      if (!open) setVideoLoaded(false);
                    }}
                  >
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors">
                        <HelpCircle className="h-3 w-3" />
                        Wo finde ich meine Telegram ID?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="glass-card border-border sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Wo finde ich meine Telegram-ID?</DialogTitle>
                        <DialogDescription className="text-muted-foreground text-xs">
                          Schau dir das kurze Video an, um deine Telegram-ID zu finden.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-secondary relative">
                        {!videoLoaded && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {videoOpen && (
                          <iframe
                            src="https://www.loom.com/embed/0582b0ea68b942728a535a98f990660b?autoplay=1"
                            frameBorder="0"
                            allowFullScreen
                            allow="autoplay"
                            className={`w-full h-full transition-opacity duration-300 ${videoLoaded ? "opacity-100" : "opacity-0"}`}
                            title="Telegram ID finden"
                            onLoad={() => setVideoLoaded(true)}
                          />
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
            <div className="h-8 w-px bg-border shrink-0" />
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-accent shrink-0" />
              {groupNameSaved && !editingGroupName ? (
                <>
                  <span className="text-sm text-foreground font-medium">{groupName}</span>
                  <Button
                    onClick={() => setEditingGroupName(true)}
                    variant="ghost"
                    size="sm"
                    className="text-[10px] text-accent h-6 px-2"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="input-gold-shimmer rounded-lg">
                    <Input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Gruppenname"
                      className="h-7 text-xs w-36 border-transparent"
                    />
                  </div>
                  <Button onClick={saveGroupName} size="sm" disabled={!groupName.trim()} className="h-7 text-xs px-2.5">
                    <Save className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-accent shrink-0" />
                <div className="input-gold-shimmer rounded-lg">
                  <span className="h-7 text-sm w-24 font-semibold border-transparent">Umsatz: €{umsatz || "0"}</span>
                </div>
              </div>
              <Badge
                className={
                  isTopTier ? "bg-accent text-accent-foreground gold-glow" : "bg-secondary text-secondary-foreground"
                }
              >
                <Award className="h-3 w-3 mr-1" />
                {currentTier.emoji} {currentTier.name}
              </Badge>
            </div>
          </div>

          {/* Mobile: stacked layout */}
          <div className="flex sm:hidden flex-col gap-3">
            {/* Row 1: Logo + Title + Badge */}
            <div className="flex items-center gap-2">
              <img src={logo} alt="Logo" className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold text-foreground leading-tight">Chatter Dashboard</h1>
              </div>
              <button
                onClick={() => setShowOnboarding(true)}
                className="hidden"
                aria-hidden
              />

              <Badge
                className={`shrink-0 text-[10px] ${isTopTier ? "bg-accent text-accent-foreground gold-glow" : "bg-secondary text-secondary-foreground"}`}
              >
                <Award className="h-3 w-3 mr-1" />
                {currentTier.emoji} {currentTier.name}
              </Badge>
            </div>

            {/* Row 2: Gruppenname */}
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-accent shrink-0" />
              {groupNameSaved && !editingGroupName ? (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-xs text-foreground font-medium truncate">{groupName}</span>
                  <Button
                    onClick={() => setEditingGroupName(true)}
                    variant="ghost"
                    size="sm"
                    className="text-[10px] text-accent h-5 px-1.5"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <div className="input-gold-shimmer rounded-lg flex-1 min-w-0">
                    <Input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Gruppenname eingeben"
                      className="h-7 text-xs w-full border-transparent"
                    />
                  </div>
                  <Button onClick={saveGroupName} size="sm" disabled={!groupName.trim()} className="h-7 text-xs px-2">
                    <Save className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Row 3: Telegram + Umsatz side by side */}
            <div className="flex items-center gap-2">
              {telegramSaved ? (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="text-xs text-foreground font-medium truncate">{telegramId}</span>
                  <Button
                    onClick={() => setTelegramSaved(false)}
                    variant="ghost"
                    size="sm"
                    className="text-[10px] text-accent h-5 px-1.5"
                  >
                    Ändern
                  </Button>
                </div>
              ) : (
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <div className="input-gold-shimmer rounded-lg flex-1 min-w-0">
                      <Input
                        value={telegramId}
                        onChange={(e) => setTelegramId(e.target.value)}
                        placeholder="Telegram ID"
                        className="h-7 text-xs w-full border-transparent"
                      />
                    </div>
                    <Button onClick={saveTelegram} size="sm" disabled={!telegramId.trim()} className="h-7 text-xs px-2">
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                  <Dialog
                    onOpenChange={(open) => {
                      setVideoOpen(open);
                      if (!open) setVideoLoaded(false);
                    }}
                  >
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors">
                        <HelpCircle className="h-3 w-3" />
                        Wo finde ich meine ID?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="glass-card border-border max-w-[calc(100vw-2rem)]">
                      <DialogHeader>
                        <DialogTitle className="text-foreground text-sm">Wo finde ich meine Telegram-ID?</DialogTitle>
                        <DialogDescription className="text-muted-foreground text-xs">
                          Schau dir das kurze Video an.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-secondary relative">
                        {!videoLoaded && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {videoOpen && (
                          <iframe
                            src="https://www.loom.com/embed/0582b0ea68b942728a535a98f990660b?autoplay=1"
                            frameBorder="0"
                            allowFullScreen
                            allow="autoplay"
                            className={`w-full h-full transition-opacity duration-300 ${videoLoaded ? "opacity-100" : "opacity-0"}`}
                            title="Telegram ID finden"
                            onLoad={() => setVideoLoaded(true)}
                          />
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              <div className="shrink-0 flex items-center gap-1" data-tour="revenue-input">
                <Zap className="h-3 w-3 text-accent" />
                <div className="input-gold-shimmer rounded-lg">
                  <span className="h-7 text-sm w-24 font-semibold border-transparent">Umsatz: €{umsatz || "0"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className={`container max-w-5xl mx-auto p-4 lg:px-8 lg:py-8 space-y-5 lg:space-y-6 ${hotStreakClass}`}>
        {/* Notification Banner */}
        <NotificationBanner />

        {/* Live Activity Ticker */}
        <LiveActivityTicker />

        {/* Stats Cards */}
        <div data-tour="stats-cards">
          {/* Mobile: 2-col grid with full-width status */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3 lg:hidden"
          >
            <motion.div
              variants={staggerItem}
              className="glass-card-subtle rounded-xl p-3 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">Umsatz gestern</p>
              <p className="text-xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedValue value={yesterdayRevenue} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="glass-card-subtle rounded-xl p-3 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">Monatsumsatz</p>
              <p className="text-xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedValue value={monthlyRevenue} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="glass-card-subtle rounded-xl p-3 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">Gesamtumsatz</p>
              <p className="text-xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedValue value={totalRevenue} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="glass-card-subtle rounded-xl p-3 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">Verdienst diesen Monat</p>
              <p className="text-xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedDecimalValue value={verdienst} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="glass-card-subtle rounded-xl p-3 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">Deine Rate</p>
              <p className="text-xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                {Math.round(rate * 100)}%
              </p>
            </motion.div>
            <div className="hidden"><DailyGoal /></div>
            <motion.div
              variants={staggerItem}
              className="gold-gradient-border-animated rounded-xl p-3 text-center col-span-2 pulse-glow"
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">Status</p>
              <p className={`text-xl font-bold ${isTopTier ? "text-gold-gradient" : "text-foreground"}`}>
                {currentTier.emoji} {currentTier.name}
              </p>
            </motion.div>
          </motion.div>
          {/* Desktop: Bento grid */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="hidden lg:grid grid-cols-4 gap-4"
          >
            <motion.div
              variants={staggerItem}
              className="glass-card-subtle rounded-xl p-5 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-xs text-muted-foreground mb-0.5">Umsatz gestern</p>
              <p className="text-2xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedValue value={yesterdayRevenue} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="col-span-2 glass-card-subtle rounded-xl p-5 text-center card-hover-glow card-inner-glow card-top-line group"
            >
              <p className="text-xs text-muted-foreground mb-0.5">Monatsumsatz</p>
              <p className="text-3xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedValue value={monthlyRevenue} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="glass-card-subtle rounded-xl p-5 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-xs text-muted-foreground mb-0.5">Gesamtumsatz</p>
              <p className="text-2xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedValue value={totalRevenue} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="col-span-2 glass-card-subtle rounded-xl p-5 text-center card-hover-glow card-inner-glow card-top-line group"
            >
              <p className="text-xs text-muted-foreground mb-0.5">Verdienst diesen Monat</p>
              <p className="text-3xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedDecimalValue value={verdienst} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="col-span-2 glass-card-subtle rounded-xl p-5 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-xs text-muted-foreground mb-0.5">Deine Rate</p>
              <p className="text-3xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                {Math.round(rate * 100)}%
              </p>
            </motion.div>
            <div className="hidden"><DailyGoal /></div>
            <motion.div
              variants={staggerItem}
              className="gold-gradient-border-animated rounded-xl p-5 text-center col-span-4 pulse-glow"
            >
              <p className="text-xs text-muted-foreground mb-0.5">Status</p>
              <p className={`text-2xl font-bold ${isTopTier ? "text-gold-gradient" : "text-foreground"}`}>
                {currentTier.emoji} {currentTier.name}
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Quick Action Bar */}
        <QuickActionBar
          onStartTour={() => setShowOnboarding(true)}
          onAskQuestion={() => setShowFrageMemo(true)}
          onFocusRevenue={() => {
            const input = document.querySelector(
              'input[placeholder="Umsatz €"], input[placeholder="€"]',
            ) as HTMLInputElement;
            if (input) {
              input.focus();
              input.scrollIntoView({ behavior: "smooth", block: "center" });
              const card = input.closest('[data-section], .glass-card, .glass-card-subtle') ?? input;
              highlightSection(card, "Tagesumsatz eintragen");
            }
          }}
          onScrollToAccount={() => {
            const el = document.querySelector('[data-section="requests"]');
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            highlightSection(el, "Anfragen an das Model");
          }}
          onScrollToInspiration={() => {
            const el = document.querySelector('[data-section="inspiration"]');
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            highlightSection(el, "Inspirations-Bibliothek");
          }}
        />

        {/* PWA Install To-Do */}
        {!isPwaInstalled && (
          <button
            onClick={() => setShowTutorial(true)}
            className="lg:hidden w-full flex items-center gap-3 glass-card-subtle rounded-xl p-3 border border-accent/30 bg-accent/5 text-left cursor-pointer hover:bg-accent/10 hover:border-accent/50 transition-all"
          >
            <Smartphone className="h-5 w-5 text-accent shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Aufgabe bevor du startest: Füge die App auf deinem Handy zum Homescreen hinzu.
              </p>
              <p className="text-xs text-accent mt-0.5 hover:underline">Wie geht das?</p>
            </div>
          </button>
        )}

        {/* 7-Day Revenue Chart */}
        <div data-tour="revenue-chart">{user && <RevenueChart userId={user.id} />}</div>
        {/* Anfrage an das Model */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="glass-card rounded-xl overflow-hidden card-inner-glow relative"
          data-section="requests"
        >
          {/* Gold shimmer sweep for extra presence */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                background: "linear-gradient(105deg, transparent 40%, hsl(43 56% 52%) 50%, transparent 60%)",
                backgroundSize: "200% 100%",
                animation: "bonus-sweep 10s ease-in-out infinite",
              }}
            />
          </div>

          {/* Prominent Header */}
          <div className="relative flex items-center gap-3 px-4 py-4 lg:px-6 lg:py-5 border-b border-accent/20 bg-accent/5">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="h-11 w-11 rounded-full bg-accent/20 flex items-center justify-center shrink-0 ring-2 ring-accent/30"
            >
              <MessageSquare className="h-5 w-5 text-accent" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-sm lg:text-base font-bold text-gold-gradient">Anfrage an das Model stellen</p>
              <p className="text-[11px] lg:text-xs text-muted-foreground mt-0.5">
                Individuelle oder allgemeine Anfragen direkt an dein Model senden
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-medium">Verfügbar</span>
            </div>
          </div>

          {/* Anfrage an das Model – oder Inaktiv-Hinweis */}
          <div className="relative">
            {demoModelInactive || assignedAccounts.some((acc) => acc.model_active === false) ? (
              <>
                <div className="flex items-center gap-3 px-4 py-4 lg:px-6 lg:py-5">
                  <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-5 w-5 text-destructive/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-muted-foreground">
                      Dein Model kann momentan keine Anfragen entgegennehmen
                    </p>
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
                        Dein Model hat uns mitgeteilt, dass sie aktuell keine neuen Anfragen entgegennehmen kann. Das
                        ist der letzte Stand, den wir haben.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                      <p className="text-sm text-foreground">
                        <strong>Trotzdem kann gutes Geld verdient werden!</strong> Es ist bereits genug Content auf
                        dem Account vorhanden, mit dem du weiterarbeiten kannst. Nutze den vorhandenen Content, um
                        Umsatz zu machen.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <div className="px-4 py-4 lg:px-6 lg:py-5">
                <ModelRequestDialog
                  onSubmitted={loadMyRequests}
                  editData={editRequest}
                  onEditClear={() => setEditRequest(null)}
                  modelLanguage={assignedAccounts.length > 0 ? (assignedAccounts[0] as any).model_language || "de" : "de"}
                />
              </div>
            )}
          </div>

          {/* Bisherige Anfragen – einklappbar */}
          {myRequests.length > 0 &&
            (() => {
              // Unseen = requests with status !== pending OR with admin_comment, that user hasn't seen yet
              const unseenCount = myRequests.filter(
                (r) =>
                  (r.status !== "pending" || r.admin_comment) &&
                  !seenRequestIds.has(r.id + "_" + r.status + "_" + (r.admin_comment || "")),
              ).length;

              const markAllSeen = () => {
                const newSeen = new Set(seenRequestIds);
                myRequests.forEach((r) => {
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
                      <span className="text-xs font-semibold text-foreground">
                        Deine Anfragen ({myRequests.length})
                      </span>
                      {unseenCount > 0 && (
                        <span className="h-5 min-w-5 px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center animate-in zoom-in duration-200">
                          {unseenCount}
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${requestsOpen ? "rotate-180" : ""}`}
                    />
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
                              In der Regel werden Anfragen innerhalb von{" "}
                              <strong className="text-foreground">24 bis 48 Stunden</strong> bearbeitet.
                              <br />
                              <br />
                              In Sonderfällen – zum Beispiel wenn das Model gesundheitlich angeschlagen ist – kann es
                              auch länger dauern.
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                      {[...myRequests]
                        .sort((a, b) =>
                          a.status === "rejected" && b.status !== "rejected"
                            ? 1
                            : b.status === "rejected" && a.status !== "rejected"
                              ? -1
                              : 0,
                        )
                        .map((req) => (
                          <div
                            key={req.id}
                            className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-foreground">{req.model_name}</span>
                                {(req as any).customer_name && (
                                  <span className="text-[10px] text-muted-foreground">
                                    Kunde: {(req as any).customer_name}
                                  </span>
                                )}
                              </div>
                              <Badge
                                variant={
                                  req.status === "accepted"
                                    ? "default"
                                    : req.status === "rejected"
                                      ? "destructive"
                                      : req.status === "in_progress"
                                        ? "secondary"
                                        : "secondary"
                                }
                                className="text-[10px]"
                              >
                                {req.status === "pending"
                                  ? "⏳ Ausstehend"
                                  : req.status === "accepted"
                                    ? "✅ Angenommen"
                                    : req.status === "in_progress"
                                      ? "⏳ Wird bearbeitet"
                                      : "❌ Abgelehnt"}
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
                            {(req as any).content_link &&
                              (req.status === "accepted" || req.status === "in_progress") && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <button className="flex items-center gap-1.5 rounded-md bg-accent/10 border border-accent/20 px-2.5 py-2 mt-1 hover:bg-accent/15 transition-colors w-full text-left">
                                      <ExternalLink className="h-3 w-3 text-accent shrink-0" />
                                      <span className="text-[11px] text-accent font-medium">
                                        Link zum angefragten Content
                                      </span>
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-sm">
                                    <DialogHeader>
                                      <DialogTitle className="text-sm">Content herunterladen & hochladen</DialogTitle>
                                      <DialogDescription className="text-xs text-muted-foreground">
                                        Schau dir kurz das Tutorial an, wie du den Content runterlädst und dann selbst
                                        hochlädst.
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
                                onClick={() =>
                                  setEditRequest({
                                    id: req.id,
                                    model_name: req.model_name,
                                    request_type: req.request_type as "individual" | "general",
                                    price: req.price,
                                    description: req.description,
                                    customer_name: (req as any).customer_name,
                                  })
                                }
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
        </motion.section>

        {/* Month Summary Widget */}
        <MonthSummaryWidget
          monthlyRevenue={monthlyRevenue}
          rate={rate}
          tierName={currentTier.name}
          tierEmoji={currentTier.emoji}
        />

        {/* Inspirations-Bibliothek (Placeholder) */}
        <InspirationLibrary />

        {/* 30-Tage Bonus-Challenge für neue Chatter */}
        <ThirtyDayChallenge />

        {/* LootBox Milestone Rewards */}
        <LootBoxReward monthlyRevenue={monthlyRevenue} />

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

        {/* Dashboard Tour Button - moved to header */}


        {/* MassDM Generator */}
        <div data-tour="massdm">
          <MassDmGenerator />
        </div>

        {/* Tägliche Aufgaben */}
        <div data-tour="checklist">
          <DailyChecklist />
        </div>

        {/* Bonus Model - alles in einer Karte (nur im Demo-Modus sichtbar) */}
        {isDemoMode() && (
          <BonusModelSection
            monthlyRevenue={monthlyRevenue}
            currentTier={currentTier}
            nextTier={nextTier}
            progressToNext={progressToNext}
            isTopTier={isTopTier}
            umsatz={umsatz}
          />
        )}

        {/* Billing countdown + Invoice button */}
        <DashboardBillingInfo onNavigate={() => navigate("/rechnung")} groupName={groupName} />
      </main>

      <DashboardChat externalOpen={chatOpen} onExternalOpenChange={setChatOpen} />

      <Dialog open={telegramHelpOpen} onOpenChange={setTelegramHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Das ist nicht deine Telegram-ID</DialogTitle>
            <DialogDescription className="space-y-3 pt-2 text-sm">
              <span className="block">
                Deine Telegram-ID besteht aus mindestens <span className="font-semibold text-foreground">7 Ziffern</span> (z.B. <span className="font-mono">123456789</span>) – nicht dein @username.
              </span>
              <span className="block font-semibold text-foreground">So findest du sie:</span>
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
            <li>Öffne Telegram und suche nach <span className="font-semibold text-foreground">@userinfobot</span></li>
            <li>Starte den Bot mit <span className="font-mono">/start</span></li>
            <li>Der Bot zeigt dir deine numerische ID an</li>
            <li>Kopiere die Zahlen und füge sie hier ein</li>
          </ol>
          <Button onClick={() => setTelegramHelpOpen(false)} className="w-full">
            Verstanden
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BonusModelSection({
  monthlyRevenue,
  currentTier,
  nextTier,
  progressToNext,
  isTopTier,
  umsatz,
}: {
  monthlyRevenue: number;
  currentTier: (typeof BONUS_TIERS)[number];
  nextTier: (typeof BONUS_TIERS)[number] | null;
  progressToNext: number;
  isTopTier: boolean;
  umsatz: number;
}) {
  const [demoMode, setDemoMode] = useState(false);
  const [demoTierIndex, setDemoTierIndex] = useState(0);

  // Demo values
  const demoTier = BONUS_TIERS[demoTierIndex];
  const demoRevenue = demoTier.max === Infinity ? demoTier.min + 500 : Math.round((demoTier.min + demoTier.max) / 2);
  const demoNextTier = demoTierIndex < BONUS_TIERS.length - 1 ? BONUS_TIERS[demoTierIndex + 1] : null;
  const demoProgress = demoNextTier
    ? Math.min(((demoRevenue - demoTier.min) / (demoNextTier.min - demoTier.min)) * 100, 100)
    : 100;

  // Use demo or real values
  const activeTier = demoMode ? demoTier : currentTier;
  const activeRevenue = demoMode ? demoRevenue : monthlyRevenue;
  const activeNextTier = demoMode ? demoNextTier : nextTier;
  const activeProgress = demoMode ? demoProgress : progressToNext;
  const activeIsTop = demoMode ? !demoNextTier : isTopTier;

  return (
    <motion.section
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      data-section="bonus"
      className="glass-card rounded-xl p-4 lg:p-6 space-y-4 relative overflow-hidden card-inner-glow"
    >
      {/* Animated gold shimmer sweep */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            background: "linear-gradient(105deg, transparent 40%, hsl(43 56% 52%) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "bonus-sweep 14s ease-in-out infinite",
          }}
        />
      </div>

      {/* Header with Demo Toggle */}
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Crown className="h-4 w-4 lg:h-5 lg:w-5 text-accent" />
            </motion.div>
            <h2 className="text-sm lg:text-base font-bold text-gold-gradient-shimmer">Bonus-Modell</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => (window.location.href = "/leaderboard")}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium bg-secondary/50 text-muted-foreground border border-border/30 hover:border-accent/20 hover:text-foreground transition-all"
            >
              <Trophy className="h-3 w-3" />
              Zur Bestenliste
            </button>
            {isDemoMode() && (
              <button
                onClick={() => {
                  setDemoMode(!demoMode);
                  setDemoTierIndex(0);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium transition-all",
                  demoMode
                    ? "bg-accent/20 text-accent border border-accent/30"
                    : "bg-secondary/50 text-muted-foreground border border-border/30 hover:border-accent/20 hover:text-foreground",
                )}
              >
                {demoMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {demoMode ? "Demo beenden" : "Demo"}
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      </div>

      {/* Demo Controls */}
      {demoMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center justify-center gap-4"
        >
          <Badge variant="outline" className="text-[10px] border-accent/30 text-accent bg-accent/5">
            Demo
          </Badge>
          <button
            onClick={() => setDemoTierIndex(Math.max(0, demoTierIndex - 1))}
            disabled={demoTierIndex === 0}
            className="h-7 w-7 rounded-full border border-border/40 bg-secondary/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-semibold text-foreground min-w-[80px] text-center">
            {demoTier.emoji} {demoTier.name}
          </span>
          <button
            onClick={() => setDemoTierIndex(Math.min(BONUS_TIERS.length - 1, demoTierIndex + 1))}
            disabled={demoTierIndex === BONUS_TIERS.length - 1}
            className="h-7 w-7 rounded-full border border-border/40 bg-secondary/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}

      <motion.div
        className="space-y-2"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
      >
        {/* Tier Cards Grid – 3-col mobile, 6-col desktop */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
        >
          <div data-tour="bonus-tiers" className="grid grid-cols-3 lg:grid-cols-7 gap-2 lg:gap-2.5">
            {BONUS_TIERS.map((tier, idx) => {
              const isActive = activeTier.name === tier.name;
              const isPassed = activeRevenue > tier.max;
              const isTitan = tier.name === "Titan";
              return (
                <motion.div
                  key={tier.name}
                  animate={isActive ? { scale: 1 } : { scale: 1 }}
                  className={cn(
                    "relative rounded-xl overflow-hidden transition-all duration-300",
                    isTitan && "col-span-3 lg:col-span-1",
                    isActive
                      ? tier.name === "Elite" || tier.name === "Titan"
                        ? "gold-gradient-border-animated bg-[hsl(0_0%_8%/0.8)]"
                        : "border border-accent/50 bg-[hsl(0_0%_8%/0.8)] shadow-[0_0_24px_hsl(43_56%_52%/0.15)]"
                      : isPassed
                        ? "border border-accent/15 bg-[hsl(0_0%_7%/0.5)]"
                        : "border border-border/20 bg-[hsl(0_0%_6%/0.4)]",
                  )}
                >
                  {/* Active top shine */}
                  {isActive && (
                    <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />
                  )}
                  {/* Passed checkmark */}
                  {isPassed && (
                    <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-accent/20 flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-accent/60" />
                    </div>
                  )}
                  <div className="relative flex flex-col items-center text-center p-3 lg:p-4 gap-1">
                    <span
                      className={cn(
                        "transition-all duration-300",
                        isActive ? "text-2xl lg:text-3xl" : "text-xl lg:text-2xl",
                      )}
                    >
                      {tier.emoji}
                    </span>
                    <p
                      className={cn(
                        "font-bold text-[10px] lg:text-xs leading-tight tracking-wide uppercase",
                        isActive ? "text-gold-gradient" : isPassed ? "text-accent/40" : "text-muted-foreground/60",
                      )}
                    >
                      {tier.name}
                    </p>
                    <p
                      className={cn(
                        "font-bold leading-none",
                        isActive
                          ? "text-lg lg:text-xl text-foreground"
                          : isPassed
                            ? "text-base lg:text-lg text-accent/30"
                            : "text-base lg:text-lg text-muted-foreground/50",
                      )}
                    >
                      {tier.rate}%
                    </p>
                    <p
                      className={cn(
                        "text-[10px] lg:text-xs leading-tight font-medium",
                        isActive
                          ? "text-accent/70"
                          : isPassed
                            ? "text-muted-foreground/40"
                            : "text-muted-foreground/60",
                      )}
                    >
                      ab {tier.min.toLocaleString("de-DE")}€
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Progress bar */}
          {activeNextTier &&
            (() => {
              const isAlmostThere = activeProgress >= 85;
              const remaining = activeNextTier.min - activeRevenue;
              return (
                <div className="mt-3 space-y-1.5">
                  <div className="relative">
                    <Progress
                      value={activeProgress}
                      className={`h-2.5 [&>div]:bg-accent shimmer-bar transition-all duration-500 ${isAlmostThere ? "gold-glow [&>div]:animate-pulse" : ""}`}
                    />
                    {isAlmostThere && (
                      <motion.div
                        className="absolute -top-6 right-0 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [1, 1.1, 1], opacity: 1 }}
                        transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                      >
                        🔥 Fast da! Nur noch {remaining.toLocaleString("de-DE")}€!
                      </motion.div>
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] lg:text-[10px] text-muted-foreground">
                    <span>
                      {activeTier.emoji} {activeRevenue.toLocaleString("de-DE")}€
                    </span>
                    <span>
                      Noch <span className="text-accent font-semibold">{remaining.toLocaleString("de-DE")}€</span> bis{" "}
                      {activeNextTier.emoji} {activeNextTier.name}
                    </span>
                  </div>
                  {(() => {
                    const now = new Date();
                    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    const daysLeft = Math.max(1, daysInMonth - now.getDate());
                    const dailyAvg = Math.ceil(remaining / daysLeft);
                    return (
                      <p className="text-[9px] lg:text-[10px] text-muted-foreground text-center mt-1">
                        ⌀ <span className="text-accent font-semibold">{dailyAvg.toLocaleString("de-DE")}€</span> pro Tag
                        nötig für {activeNextTier.emoji} {activeNextTier.name}
                      </p>
                    );
                  })()}
                </div>
              );
            })()}
          {activeIsTop && (
            <p className="text-[10px] text-accent font-semibold mt-3 text-center">🏆 Höchste Stufe erreicht!</p>
          )}
        </motion.div>

        {/* Spacer before streaks */}
        <div className="h-6 lg:h-8" />

        {/* Account Upgrade - Streak */}
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

        {/* 30-Tage-Challenge */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
          className="relative rounded-xl overflow-hidden bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 p-4 lg:p-5 space-y-4 transition-transform duration-200 hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center">
                <span className="text-lg">💎</span>
              </div>
              <div>
                <p className="font-bold text-accent text-sm lg:text-base">30-Tage-Challenge</p>
                <p className="text-[10px] lg:text-xs text-muted-foreground">30 Tage in Folge mind. 100€ Umsatz</p>
              </div>
            </div>
          </div>
          <MonthlyStreakTracker dailyRevenue={umsatz} />
        </motion.div>
      </motion.div>

      <p className="text-[10px] lg:text-xs text-muted-foreground">
        Deine Rate gilt für den <strong className="text-foreground">gesamten Monatsumsatz</strong> und wird automatisch
        angepasst.
      </p>
      <p className="text-[10px] lg:text-xs text-muted-foreground">
        7 Tage × 30€ = <strong className="text-foreground">Account Upgrade</strong> · 30 Tage × 100€ ={" "}
        <strong className="text-foreground">Elite Stufe 💎</strong>
      </p>
    </motion.section>
  );
}
const REFERRAL_LINKEDIN_URL = "LINKEDIN_URL";

function DashboardBillingInfo({ onNavigate, groupName }: { onNavigate: () => void; groupName: string }) {
  const now = new Date();
  const deadline = endOfMonth(addMonths(now, 1));
  const daysLeft = differenceInDays(deadline, now);
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalDays = differenceInDays(deadline, startDate);
  const progressPct = Math.round(((totalDays - daysLeft) / totalDays) * 100);

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
            <p className="text-xs font-semibold text-gold-gradient">
              {format(deadline, "dd. MMM yyyy", { locale: de })}
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>
              Noch <span className="text-accent font-semibold">{daysLeft}</span> Tage
            </span>
            <span>{format(deadline, "dd.MM.yyyy")}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden shimmer-bar">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <Button
        onClick={onNavigate}
        className="w-full h-11 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:brightness-110 transition-all"
      >
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
                <p className="text-[10px] text-muted-foreground">
                  Verdiene 1% von dem, was sie verdienen – <span className="text-accent font-semibold">Lifetime</span>
                </p>
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
                Für jeden Freund, den du zu uns bringst, erhältst du{" "}
                <span className="text-accent font-semibold">1% von dessen Verdienst – lebenslang</span>. Je mehr Freunde
                du empfiehlst, desto mehr verdienst du passiv dazu.
              </p>
            </div>

            {/* Important note */}
            <div className="glass-card-subtle rounded-lg p-3 space-y-2 border border-accent/20">
              <p className="text-xs text-foreground font-medium flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-accent" />
                Wichtig
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Dein Freund muss im Bewerbungsprozess deinen{" "}
                <span className="text-foreground font-semibold">Gruppennamen</span> angeben, damit wir die Empfehlung
                zuordnen können.
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
                } catch {
                  toast.error("Kopieren fehlgeschlagen");
                }
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
                  Hey! Ich arbeite als Chatter und verdiene damit richtig gutes Geld. Wenn du Lust hast, bewirb dich
                  hier!
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Wichtig: Gib bei der Bewerbung meinen Gruppennamen „
                  <span className="text-accent font-semibold">{groupName || "—"}</span>" an – das ist nötig, damit es
                  zugeordnet werden kann!
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
    </div>
  );
}
