import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Save, CheckCircle2, Award, Zap, HelpCircle, FileText, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import DashboardChat from "@/components/DashboardChat";
import DailyChecklist from "@/components/DailyChecklist";
import DailyGoal from "@/components/DailyGoal";
import StreakTracker from "@/components/StreakTracker";
import NotificationBanner from "@/components/NotificationBanner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { format, endOfMonth, addMonths, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";

const GOLD_THRESHOLD = 2000;
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

  // Load telegram_id from profiles table
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("telegram_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.telegram_id) {
          setTelegramId(data.telegram_id);
          setTelegramSaved(true);
        }
        setTelegramLoading(false);
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

  const [videoOpen, setVideoOpen] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [umsatz, setUmsatz] = useState(0);
  const [hadConfetti, setHadConfetti] = useState(false);

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
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-accent shrink-0" />
                <Input type="number" min={0} step={50} value={umsatz || ""} onChange={(e) => setUmsatz(Number(e.target.value) || 0)} placeholder="Umsatz €" className="h-7 text-xs w-24 font-semibold" />
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

            {/* Row 2: Telegram + Umsatz side by side */}
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
                <Input type="number" min={0} step={50} value={umsatz || ""} onChange={(e) => setUmsatz(Number(e.target.value) || 0)} placeholder="€" className="h-7 text-xs w-20 font-semibold" />
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
            <p className="text-[10px] text-muted-foreground mb-0.5">Umsatz</p>
            <p className="text-xl font-bold text-gold-gradient">{umsatz.toLocaleString("de-DE")}€</p>
          </div>
          <div className="glass-card-subtle rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Verdienst</p>
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
        {/* Desktop: 5-col grid */}
        <div className="hidden lg:grid grid-cols-5 gap-4">
          <div className="glass-card-subtle rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Umsatz</p>
            <p className="text-2xl font-bold text-gold-gradient">{umsatz.toLocaleString("de-DE")}€</p>
          </div>
          <div className="glass-card-subtle rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Verdienst</p>
            <p className="text-2xl font-bold text-gold-gradient">{verdienst.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</p>
          </div>
          <div className="glass-card-subtle rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Deine Rate</p>
            <p className="text-2xl font-bold text-gold-gradient">{Math.round(rate * 100)}%</p>
          </div>
          <DailyGoal />
          <div className="glass-card-subtle rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Status</p>
            <p className={`text-2xl font-bold ${isGold ? "text-gold-gradient" : "text-muted-foreground"}`}>{isGold ? "Gold" : "Starter"}</p>
          </div>
        </div>

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
                    <p className="text-[10px] lg:text-xs text-muted-foreground">Ab 2.000€ Umsatz</p>
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
            Ab 2.000€ Umsatz gilt die 25%-Rate auf den <strong className="text-foreground">gesamten</strong> Betrag.
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
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors">
                <HelpCircle className="h-3 w-3" />
                Warum dauert das so lange?
              </button>
            </DialogTrigger>
            <DialogContent className="glass-card border-accent/20 sm:max-w-md shadow-[0_0_30px_-5px_hsl(var(--accent)/0.15),0_0_60px_-10px_hsl(var(--accent)/0.08)]">
              <DialogHeader>
                <DialogTitle className="text-foreground text-sm">Warum dauert das so lange?</DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">Hier erkläre ich es dir kurz per Sprachmemo.</DialogDescription>
              </DialogHeader>
              <audio controls className="w-full" preload="none">
                <source src="/audio/billing-info.mp3" type="audio/mpeg" />
              </audio>
            </DialogContent>
          </Dialog>
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
