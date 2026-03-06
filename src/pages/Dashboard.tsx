import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Save, CheckCircle2, Award, Zap, HelpCircle, FileText, Clock, Users, Pencil, ChevronDown, Copy, Smartphone, Mic, MessageSquare } from "lucide-react";
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
  const [assignedAccounts, setAssignedAccounts] = useState<{id: string;account_email: string;account_password: string;account_domain: string;platform: string;assigned_at: string | null;}[]>([]);
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
    select("id, account_email, account_password, account_domain, platform, assigned_at").
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
      <header className="border-b border-border">
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
        <div className="grid grid-cols-2 gap-3 lg:hidden">
          <div className="glass-card-subtle rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Umsatz gestern</p>
            <p className="text-xl font-bold text-gold-gradient">{yesterdayRevenue.toLocaleString("de-DE")}€</p>
          </div>
          <div className="glass-card-subtle rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Monatsumsatz</p>
            <p className="text-xl font-bold text-gold-gradient">{monthlyRevenue.toLocaleString("de-DE")}€</p>
          </div>
          <div className="glass-card-subtle rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Gesamtumsatz</p>
            <p className="text-xl font-bold text-gold-gradient">{totalRevenue.toLocaleString("de-DE")}€</p>
          </div>
          <div className="glass-card-subtle rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Verdienst diesen Monat</p>
            <p className="text-xl font-bold text-gold-gradient">{verdienst.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</p>
          </div>
          <div className="glass-card-subtle rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Deine Rate</p>
            <p className="text-xl font-bold text-gold-gradient">{Math.round(rate * 100)}%</p>
          </div>
          <DailyGoal />
          <div className="glass-card-subtle rounded-xl p-3 text-center col-span-2">
            <p className="text-[10px] text-muted-foreground mb-0.5">Status</p>
            <p className={`text-xl font-bold ${isGold ? "text-gold-gradient" : "text-muted-foreground"}`}>{isGold ? "Gold" : "Starter"}</p>
          </div>
        </div>
        {/* Desktop grid */}
        <div className="hidden lg:grid grid-cols-3 gap-4">
          <div className="glass-card-subtle rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Umsatz gestern</p>
            <p className="text-2xl font-bold text-gold-gradient">{yesterdayRevenue.toLocaleString("de-DE")}€</p>
          </div>
          <div className="glass-card-subtle rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Monatsumsatz</p>
            <p className="text-2xl font-bold text-gold-gradient">{monthlyRevenue.toLocaleString("de-DE")}€</p>
          </div>
          <div className="glass-card-subtle rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Gesamtumsatz</p>
            <p className="text-2xl font-bold text-gold-gradient">{totalRevenue.toLocaleString("de-DE")}€</p>
          </div>
          <div className="glass-card-subtle rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Verdienst diesen Monat</p>
            <p className="text-2xl font-bold text-gold-gradient">{verdienst.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</p>
          </div>
          <div className="glass-card-subtle rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Deine Rate</p>
            <p className="text-2xl font-bold text-gold-gradient">{Math.round(rate * 100)}%</p>
          </div>
          <DailyGoal />
          <div className="glass-card-subtle rounded-xl p-5 text-center col-span-3">
            <p className="text-xs text-muted-foreground mb-0.5">Status</p>
            <p className={`text-2xl font-bold ${isGold ? "text-gold-gradient" : "text-muted-foreground"}`}>{isGold ? "Gold" : "Starter"}</p>
          </div>
        </div>

        {/* PWA Install To-Do – between Status and Account, non-dismissable, auto-hides when installed */}
        {!isPwaInstalled &&
        <button
          onClick={() => setShowTutorial(true)}
          className="w-full flex items-center gap-3 glass-card-subtle rounded-xl p-3 lg:p-4 border border-accent/30 bg-accent/5 text-left cursor-pointer hover:bg-accent/10 transition-colors">
          
            <Smartphone className="h-5 w-5 text-accent shrink-0" />
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
          className="w-full flex items-center gap-3 glass-card-subtle rounded-xl p-3 lg:p-4 border border-accent/30 bg-accent/5 text-left cursor-pointer hover:bg-accent/10 transition-colors"
        >
          <HelpCircle className="h-5 w-5 text-accent shrink-0" />
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
              {assignedAccounts.length === 0 ?
            <p className="text-xs text-muted-foreground">Noch keine Accounts zugewiesen.</p> :

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
                          <button onClick={() => {if (acc.account_email) {navigator.clipboard.writeText(acc.account_email);toast.success("E-Mail kopiert!");}}} className="flex items-center gap-2 w-full rounded-lg border border-border/50 bg-secondary/40 px-3 py-2 hover:border-accent/50 hover:bg-secondary/60 active:scale-[0.98] transition-all cursor-pointer group" title="Klicken zum Kopieren">
                            <p className="text-xs lg:text-sm font-medium text-foreground truncate flex-1 text-left">{acc.account_email || "–"}</p>
                            {acc.account_email && <Copy className="h-3.5 w-3.5 text-accent shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />}
                          </button>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Passwort</p>
                          <button onClick={() => {if (acc.account_password) {navigator.clipboard.writeText(acc.account_password);toast.success("Passwort kopiert!");}}} className="flex items-center gap-2 w-full rounded-lg border border-border/50 bg-secondary/40 px-3 py-2 hover:border-accent/50 hover:bg-secondary/60 active:scale-[0.98] transition-all cursor-pointer group" title="Klicken zum Kopieren">
                            <p className="text-xs lg:text-sm font-medium text-foreground truncate flex-1 text-left">{acc.account_password || "–"}</p>
                            {acc.account_password && <Copy className="h-3.5 w-3.5 text-accent shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />}
                          </button>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Domain</p>
                          {acc.account_domain ?
                        <a href={`https://${acc.account_domain.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center rounded-lg border border-border/50 bg-secondary/40 px-3 py-2 text-xs lg:text-sm font-medium text-primary underline underline-offset-2 hover:border-accent/50 hover:bg-secondary/60 transition-all truncate">{acc.account_domain}</a> :

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
                        </div>
                    }
                    </div>);

              })}
                </div>
            }
            </div>
          }

          {/* Anfrage an das Model – immer sichtbar */}
          <div className="border-t border-border/30">
            <ModelRequestDialog
              onSubmitted={loadMyRequests}
              editData={editRequest}
              onEditClear={() => setEditRequest(null)}
            />
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
                    {myRequests.map((req) => (
                      <div key={req.id} className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-foreground">{req.model_name}</span>
                          <Badge variant={req.status === "accepted" ? "default" : req.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                            {req.status === "pending" ? "⏳ Ausstehend" : req.status === "accepted" ? "✅ Angenommen" : "⏳ Wird bearbeitet"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{req.description}</p>
                        {req.admin_comment && (
                          <div className="flex items-start gap-1.5 rounded-md bg-accent/10 border border-accent/20 px-2.5 py-2 mt-1">
                            <MessageSquare className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                            <p className="text-[11px] text-foreground leading-relaxed">{req.admin_comment}</p>
                          </div>
                        )}
                        {/* Bearbeiten Button – nur bei Admin-Kommentar */}
                        {req.admin_comment && (
                          <button
                            onClick={() => setEditRequest({
                              id: req.id,
                              model_name: req.model_name,
                              request_type: req.request_type as "individual" | "general",
                              price: req.price,
                              description: req.description,
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
        <section className="glass-card rounded-xl p-4 lg:p-6 space-y-4">
          <h2 className="text-sm lg:text-base font-semibold text-foreground">Bonus-Modell</h2>

          <div className="space-y-2">
            {/* Account Upgrade - Tier 1 (top) with streak */}
            <div className="relative rounded-xl overflow-hidden border border-accent/30 bg-accent/5 p-4 lg:p-5 space-y-4">
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
              {/* Streak tracker inline */}
              <StreakTracker dailyRevenue={umsatz} />
            </div>

            {/* Gold - Tier 2 with progress bar */}
            <div className={`relative rounded-xl overflow-hidden border p-4 lg:p-5 space-y-3 transition-all ${isGold ? "border-accent/40 gold-border-glow bg-accent/10" : "border-border bg-secondary/30"}`}>
              {isGold && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isGold ? "bg-accent/20 gold-glow" : "bg-secondary"}`}>
                    <Award className={`h-5 w-5 ${isGold ? "text-accent" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className={`font-bold text-sm lg:text-base ${isGold ? "text-gold-gradient" : "text-muted-foreground"}`}>Gold-Status</p>
                    <p className="text-[10px] lg:text-xs text-muted-foreground">Ab 3.000€ Monatsumsatz</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-bold text-lg lg:text-xl ${isGold ? "text-gold-gradient" : "text-muted-foreground"}`}>25%</span>
                  {isGold && <p className="text-[10px] text-accent">Aktiv ✓</p>}
                </div>
              </div>
              {/* Gold progress bar */}
              <div className="space-y-1.5">
                <Progress value={progressPct} className="h-2 [&>div]:bg-accent" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{umsatz.toLocaleString("de-DE")}€</span>
                  <span>
                    {isGold ?
                    "Gold-Status aktiv 🎉" :
                    `Noch ${(GOLD_THRESHOLD - umsatz).toLocaleString("de-DE")}€`}
                  </span>
                </div>
              </div>
            </div>

            {/* Starter - Tier 3 */}
            <div className={`relative rounded-xl overflow-hidden border p-4 lg:p-5 transition-all ${!isGold ? "border-border bg-secondary/50" : "border-border/50 bg-secondary/20"}`}>
              {!isGold && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${!isGold ? "bg-secondary" : "bg-secondary/50"}`}>
                    <Zap className={`h-5 w-5 ${!isGold ? "text-foreground" : "text-muted-foreground/50"}`} />
                  </div>
                  <div>
                    <p className={`font-bold text-sm lg:text-base ${!isGold ? "text-foreground" : "text-muted-foreground/50"}`}>Starter</p>
                    <p className="text-[10px] lg:text-xs text-muted-foreground">0€ – 2.999€ Umsatz</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-bold text-lg lg:text-xl ${!isGold ? "text-foreground" : "text-muted-foreground/50"}`}>20%</span>
                  {!isGold

                  }
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] lg:text-xs text-muted-foreground">
            Ab 3.000€ Monatsumsatz gilt die 25%-Rate für diesen Monat auf den <strong className="text-foreground">gesamten Betrag</strong>.
          </p>
          <p className="text-[10px] lg:text-xs text-muted-foreground">
            7 Tage in Folge mind. 30€ = <strong className="text-foreground">Upgrade auf besseren Account</strong>.
          </p>
        </section>

        {/* Billing countdown + Invoice button */}
        <DashboardBillingInfo onNavigate={() => navigate("/rechnung")} />
      </main>

      <DashboardChat externalOpen={chatOpen} onExternalOpenChange={setChatOpen} />
    </div>);}

function DashboardBillingInfo({ onNavigate }: {onNavigate: () => void;}) {
  const now = new Date();
  const deadline = endOfMonth(addMonths(now, 1));
  const daysLeft = differenceInDays(deadline, now);
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalDays = differenceInDays(deadline, startDate);
  const progressPct = Math.round((totalDays - daysLeft) / totalDays * 100);

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
            <span>Noch {daysLeft} Tage</span>
            <span>{format(deadline, "dd.MM.yyyy")}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>
      <Button
        onClick={onNavigate}
        variant="outline"
        className="w-full h-11 border-border text-foreground hover:bg-secondary">
        
        <FileText className="mr-2 h-4 w-4 text-accent" />
        Rechnung erstellen
      </Button>
    </div>);

}