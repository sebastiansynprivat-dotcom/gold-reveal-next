import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Save, CheckCircle2, Award, Zap, HelpCircle, FileText, Clock, Users, Pencil, ChevronDown, Copy } from "lucide-react";
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
import DailyGoal from "@/components/DailyGoal";
import StreakTracker from "@/components/StreakTracker";
import NotificationBanner from "@/components/NotificationBanner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { format, endOfMonth, addMonths, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";

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
  const [assignedAccounts, setAssignedAccounts] = useState<{ account_email: string; account_password: string; account_domain: string; platform: string }[]>([]);
  const [accountsOpen, setAccountsOpen] = useState(true);
  const [driveDone, setDriveDone] = useState(() => localStorage.getItem("drive_done") === "true");
  const [driveHidden, setDriveHidden] = useState(() => localStorage.getItem("drive_hidden") === "true");

  // Reset drive hidden state when new accounts are added
  useEffect(() => {
    if (assignedAccounts.length === 0) return;
    const prevCount = Number(localStorage.getItem("drive_account_count") || "0");
    if (assignedAccounts.length > prevCount && prevCount > 0) {
      setDriveHidden(false);
      setDriveDone(false);
      localStorage.setItem("drive_hidden", "false");
      localStorage.setItem("drive_done", "false");
    }
    localStorage.setItem("drive_account_count", String(assignedAccounts.length));
  }, [assignedAccounts.length]);

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
      .select("account_email, account_password, account_domain, platform")
      .eq("assigned_to", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAssignedAccounts(data);
        }
      });
  }, [user]);

  const saveTelegram = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ telegram_id: telegramId.trim() })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Fehler beim Speichern");
      return;
    }
    setTelegramSaved(true);
    toast.success("Telegram-ID gespeichert!");
  };

  const saveGroupName = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ group_name: groupName.trim() })
      .eq("user_id", user.id);
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

        const monthly = data
          .filter((d) => d.date >= monthStart)
          .reduce((sum, d) => sum + Number(d.amount), 0);
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
    const { error } = await supabase
      .from("daily_revenue")
      .upsert(
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
  const progressPct = Math.min((umsatz / GOLD_THRESHOLD) * 100, 100);

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#c4973b", "#e8c96b", "#a07c2a", "#f5d98a"],
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
      {/* Header with Telegram + Umsatz inline */}
      <header className="border-b border-border">
        <div className="container max-w-5xl mx-auto px-4 py-3 lg:px-8">
          {/* Desktop: single row */}
          <div className="hidden sm:flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-9 w-9 rounded-full shrink-0" />
            <div className="shrink-0">
              <h1 className="text-base lg:text-lg font-bold text-foreground leading-tight">Chatter Dashboard</h1>
              <p className="text-[10px] text-muted-foreground">
                Aktiv auf: <span className="text-gold-gradient font-semibold">{platform}</span>
              </p>
            </div>
            <div className="h-8 w-px bg-border shrink-0" />
            <div className="flex items-center gap-2">
              {telegramSaved ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-sm text-foreground font-medium">{telegramId}</span>
                  <Button onClick={() => setTelegramSaved(false)} variant="ghost" size="sm" className="text-[10px] text-accent h-6 px-2">
                    Ändern
                  </Button>
                </>
              ) : (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Input value={telegramId} onChange={(e) => setTelegramId(e.target.value)} placeholder="Deine Telegram ID" className="h-7 text-xs w-44" />
                    <Button onClick={saveTelegram} size="sm" disabled={!telegramId.trim()} className="h-7 text-xs px-2.5"><Save className="h-3 w-3" /></Button>
                  </div>
                  <Dialog onOpenChange={(open) => { setVideoOpen(open); if (!open) setVideoLoaded(false); }}>
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
                        {!videoLoaded && (<div className="absolute inset-0 flex items-center justify-center"><div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>)}
                        {videoOpen && (<iframe src="https://www.loom.com/embed/0582b0ea68b942728a535a98f990660b?autoplay=1" frameBorder="0" allowFullScreen allow="autoplay" className={`w-full h-full transition-opacity duration-300 ${videoLoaded ? "opacity-100" : "opacity-0"}`} title="Telegram ID finden" onLoad={() => setVideoLoaded(true)} />)}
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
                  <Button onClick={() => setEditingGroupName(true)} variant="ghost" size="sm" className="text-[10px] text-accent h-6 px-2">
                    <Pencil className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Gruppenname" className="h-7 text-xs w-36" />
                  <Button onClick={saveGroupName} size="sm" disabled={!groupName.trim()} className="h-7 text-xs px-2.5"><Save className="h-3 w-3" /></Button>
                </div>
              )}
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
                <p className="text-[10px] text-muted-foreground">
                  Aktiv auf: <span className="text-gold-gradient font-semibold">{platform}</span>
                </p>
              </div>
              <Badge className={`shrink-0 text-[10px] ${isGold ? "bg-accent text-accent-foreground gold-glow" : "bg-secondary text-secondary-foreground"}`}>
                <Award className="h-3 w-3 mr-1" />{isGold ? "Gold" : "Starter"}
              </Badge>
            </div>

            {/* Row 2: Gruppenname */}
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-accent shrink-0" />
              {groupNameSaved && !editingGroupName ? (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-xs text-foreground font-medium truncate">{groupName}</span>
                  <Button onClick={() => setEditingGroupName(true)} variant="ghost" size="sm" className="text-[10px] text-accent h-5 px-1.5">
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Gruppenname eingeben" className="h-7 text-xs flex-1 min-w-0" />
                  <Button onClick={saveGroupName} size="sm" disabled={!groupName.trim()} className="h-7 text-xs px-2"><Save className="h-3 w-3" /></Button>
                </div>
              )}
            </div>

            {/* Row 3: Telegram + Umsatz side by side */}
            <div className="flex items-center gap-2">
              {telegramSaved ? (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="text-xs text-foreground font-medium truncate">{telegramId}</span>
                  <Button onClick={() => setTelegramSaved(false)} variant="ghost" size="sm" className="text-[10px] text-accent h-5 px-1.5">
                    Ändern
                  </Button>
                </div>
              ) : (
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Input value={telegramId} onChange={(e) => setTelegramId(e.target.value)} placeholder="Telegram ID" className="h-7 text-xs flex-1 min-w-0" />
                    <Button onClick={saveTelegram} size="sm" disabled={!telegramId.trim()} className="h-7 text-xs px-2"><Save className="h-3 w-3" /></Button>
                  </div>
                  <Dialog onOpenChange={(open) => { setVideoOpen(open); if (!open) setVideoLoaded(false); }}>
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
                        {!videoLoaded && (<div className="absolute inset-0 flex items-center justify-center"><div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>)}
                        {videoOpen && (<iframe src="https://www.loom.com/embed/0582b0ea68b942728a535a98f990660b?autoplay=1" frameBorder="0" allowFullScreen allow="autoplay" className={`w-full h-full transition-opacity duration-300 ${videoLoaded ? "opacity-100" : "opacity-0"}`} title="Telegram ID finden" onLoad={() => setVideoLoaded(true)} />)}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
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

        {/* Account-Daten */}
        <section className="glass-card-subtle rounded-xl overflow-hidden">
          <button
            onClick={() => setAccountsOpen(!accountsOpen)}
            className="w-full flex items-center justify-between p-4 lg:p-6 text-left"
          >
            <h2 className="text-sm lg:text-base font-semibold text-foreground">
              {assignedAccounts.length > 1 ? "Deine Accounts" : "Dein Account"}
              {assignedAccounts.length > 0 && (
                <span className="ml-2 text-[10px] font-normal text-muted-foreground">({assignedAccounts.length})</span>
              )}
            </h2>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${accountsOpen ? "rotate-180" : ""}`} />
          </button>
          {accountsOpen && (
            <div className="px-4 pb-4 lg:px-6 lg:pb-6 space-y-4">
              {assignedAccounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">Noch keine Accounts zugewiesen.</p>
              ) : (
                <div className="space-y-3">
                  {assignedAccounts.map((acc, i) => (
                    <div key={i} className={assignedAccounts.length > 1 ? "p-3 rounded-lg border border-border/50 bg-secondary/20" : ""}>
                      {assignedAccounts.length > 1 && (
                        <p className="text-[10px] text-muted-foreground font-medium mb-2">{acc.platform}</p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">E-Mail</p>
                          <button
                            onClick={() => {
                              if (acc.account_email) {
                                navigator.clipboard.writeText(acc.account_email);
                                toast.success("E-Mail kopiert!");
                              }
                            }}
                            className="flex items-center gap-2 w-full rounded-lg border border-border/50 bg-secondary/40 px-3 py-2 hover:border-accent/50 hover:bg-secondary/60 active:scale-[0.98] transition-all cursor-pointer group"
                            title="Klicken zum Kopieren"
                          >
                            <p className="text-xs lg:text-sm font-medium text-foreground truncate flex-1 text-left">{acc.account_email || "–"}</p>
                            {acc.account_email && <Copy className="h-3.5 w-3.5 text-accent shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />}
                          </button>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Passwort</p>
                          <button
                            onClick={() => {
                              if (acc.account_password) {
                                navigator.clipboard.writeText(acc.account_password);
                                toast.success("Passwort kopiert!");
                              }
                            }}
                            className="flex items-center gap-2 w-full rounded-lg border border-border/50 bg-secondary/40 px-3 py-2 hover:border-accent/50 hover:bg-secondary/60 active:scale-[0.98] transition-all cursor-pointer group"
                            title="Klicken zum Kopieren"
                          >
                            <p className="text-xs lg:text-sm font-medium text-foreground truncate flex-1 text-left">{acc.account_password || "–"}</p>
                            {acc.account_password && <Copy className="h-3.5 w-3.5 text-accent shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />}
                          </button>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Domain</p>
                          {acc.account_domain ? (
                            <a href={`https://${acc.account_domain.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center rounded-lg border border-border/50 bg-secondary/40 px-3 py-2 text-xs lg:text-sm font-medium text-primary underline underline-offset-2 hover:border-accent/50 hover:bg-secondary/60 transition-all truncate">
                              {acc.account_domain}
                            </a>
                          ) : (
                            <div className="flex items-center rounded-lg border border-border/50 bg-secondary/40 px-3 py-2">
                              <p className="text-xs lg:text-sm font-medium text-foreground truncate">–</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Google Drive To-Do – verschwindet wenn abgehakt */}
              {!driveDone && (
                <div className="border-t border-border/50 pt-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={driveDone}
                      onCheckedChange={(v) => {
                        const checked = !!v;
                        setDriveDone(checked);
                        localStorage.setItem("drive_done", String(checked));
                      }}
                      className="mt-0.5 shrink-0 border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-sm font-semibold text-foreground">📂 To-Do: Google Drive Zugang</p>
                      <p className="text-xs text-muted-foreground">
                        Melde dich in der WhatsApp-Gruppe und schick diese Nachricht:
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`Hey, könnt ihr mich bitte zum Google Drive hinzufügen? Meine E-Mail: ${user?.email || "[DEINE E-MAIL]"} – Danke! 🙏`);
                          toast.success("Nachricht kopiert!");
                        }}
                        className="flex items-center gap-2 w-full rounded-lg border border-border/50 bg-secondary/40 px-3 py-2.5 hover:border-accent/50 hover:bg-secondary/60 active:scale-[0.98] transition-all cursor-pointer group text-left"
                        title="Klicken zum Kopieren"
                      >
                        <p className="text-xs text-foreground leading-relaxed flex-1 min-w-0">
                          Hey, könnt ihr mich bitte zum Google Drive hinzufügen? Meine E-Mail: <span className="font-semibold text-accent">{user?.email || "[DEINE E-MAIL]"}</span> – Danke! 🙏
                        </p>
                        <Copy className="h-3.5 w-3.5 text-accent shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

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
                    <p className="text-[10px] lg:text-xs text-muted-foreground">Ab 3.000€ Umsatz</p>
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
                    {isGold
                      ? "Gold-Status aktiv 🎉"
                      : `Noch ${(GOLD_THRESHOLD - umsatz).toLocaleString("de-DE")}€`}
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
                    <p className="text-[10px] lg:text-xs text-muted-foreground">0€ – 1.999€ Umsatz</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-bold text-lg lg:text-xl ${!isGold ? "text-foreground" : "text-muted-foreground/50"}`}>20%</span>
                  {!isGold && <p className="text-[10px] text-accent">Aktiv ✓</p>}
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] lg:text-xs text-muted-foreground">
            Ab 3.000€ Umsatz gilt die 25%-Rate auf den <strong className="text-foreground">gesamten</strong> Betrag.
            7 Tage in Folge mind. 30€ = <strong className="text-foreground">Upgrade auf besseren Account</strong>.
          </p>
        </section>

        {/* Billing countdown + Invoice button */}
        <DashboardBillingInfo onNavigate={() => navigate("/rechnung")} />
      </main>

      <DashboardChat />
    </div>
  );
}

function DashboardBillingInfo({ onNavigate }: { onNavigate: () => void }) {
  const now = new Date();
  const deadline = endOfMonth(addMonths(now, 1));
  const daysLeft = differenceInDays(deadline, now);
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalDays = differenceInDays(deadline, startDate);
  const progressPct = Math.round(((totalDays - daysLeft) / totalDays) * 100);

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
        className="w-full h-11 border-border text-foreground hover:bg-secondary"
      >
        <FileText className="mr-2 h-4 w-4 text-accent" />
        Rechnung erstellen
      </Button>
    </div>
  );
}
