import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Save, CheckCircle2, TrendingUp, Award, Zap, HelpCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import DashboardChat from "@/components/DashboardChat";
import StreakTracker from "@/components/StreakTracker";
import logo from "@/assets/logo.png";

const GOLD_THRESHOLD = 2000;
const STARTER_RATE = 0.2;
const GOLD_RATE = 0.25;

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const platform = searchParams.get("platform") || "Brezzels";

  const [telegramId, setTelegramId] = useState(() => localStorage.getItem("telegram_id") || "");
  const [telegramSaved, setTelegramSaved] = useState(!!localStorage.getItem("telegram_id"));

  const saveTelegram = () => {
    localStorage.setItem("telegram_id", telegramId);
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
      {/* Header */}
      <header className="border-b border-border">
        <div className="container max-w-5xl mx-auto flex items-center justify-between p-4 lg:px-8">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-10 lg:h-12 lg:w-12 rounded-full" />
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-foreground">Chatter Dashboard</h1>
              <p className="text-xs lg:text-sm text-muted-foreground">
                Aktiv auf: <span className="text-gold-gradient font-semibold">{platform}</span>
              </p>
            </div>
          </div>
          <Badge
            className={
              isGold
                ? "bg-accent text-accent-foreground gold-glow hidden sm:flex"
                : "bg-secondary text-secondary-foreground hidden sm:flex"
            }
          >
            <Award className="h-3 w-3 mr-1" />
            {isGold ? "Gold-Status" : "Starter"}
          </Badge>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto p-4 lg:px-8 lg:py-8 space-y-6 lg:space-y-8">
        {/* Top row: Telegram + Umsatz Input side by side on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <section className="glass-card rounded-xl p-4 lg:p-6 space-y-3">
            <h2 className="text-sm lg:text-base font-semibold text-foreground flex items-center gap-2">
              {telegramSaved ? (
                <>
                  Telegram ID hinterlegt
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                </>
              ) : (
                "Telegram ID hinterlegen"
              )}
            </h2>
            {telegramSaved ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{telegramId}</span>
                <Button onClick={() => setTelegramSaved(false)} variant="ghost" size="sm" className="text-xs text-accent">
                  Ändern
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  placeholder="@dein_username"
                  className="flex-1"
                />
                <Button onClick={saveTelegram} size="sm" disabled={!telegramId.trim()}>
                  <Save className="h-4 w-4 mr-1" /> Speichern
                </Button>
              </div>
            )}
            <Dialog onOpenChange={(open) => { setVideoOpen(open); if (!open) setVideoLoaded(false); }}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Wo finde ich meine Telegram-ID?
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
          </section>

          {/* Umsatz Input */}
          <section className="glass-card rounded-xl p-4 lg:p-6 space-y-3">
            <h2 className="text-sm lg:text-base font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" /> Umsatz eingeben
            </h2>
            <p className="text-xs text-muted-foreground">Gib deinen aktuellen Umsatz ein, um deinen Verdienst zu berechnen.</p>
            <Input
              type="number"
              min={0}
              step={50}
              value={umsatz || ""}
              onChange={(e) => setUmsatz(Number(e.target.value) || 0)}
              placeholder="0"
              className="font-semibold text-lg"
            />
          </section>
        </div>

        {/* Stats Cards - 2 on mobile, 4 metrics on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
          <div className="glass-card-subtle rounded-xl p-4 lg:p-6 text-center">
            <p className="text-xs lg:text-sm text-muted-foreground mb-1">Umsatz</p>
            <p className="text-2xl lg:text-3xl font-bold text-gold-gradient">
              {umsatz.toLocaleString("de-DE")}€
            </p>
          </div>
          <div className="glass-card-subtle rounded-xl p-4 lg:p-6 text-center">
            <p className="text-xs lg:text-sm text-muted-foreground mb-1">Verdienst</p>
            <p className="text-2xl lg:text-3xl font-bold text-gold-gradient">
              {verdienst.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
            </p>
          </div>
          <div className="glass-card-subtle rounded-xl p-4 lg:p-6 text-center">
            <p className="text-xs lg:text-sm text-muted-foreground mb-1">Deine Rate</p>
            <p className="text-2xl lg:text-3xl font-bold text-gold-gradient">
              {Math.round(rate * 100)}%
            </p>
          </div>
          <div className="glass-card-subtle rounded-xl p-4 lg:p-6 text-center">
            <p className="text-xs lg:text-sm text-muted-foreground mb-1">Status</p>
            <p className={`text-2xl lg:text-3xl font-bold ${isGold ? "text-gold-gradient" : "text-muted-foreground"}`}>
              {isGold ? "Gold" : "Starter"}
            </p>
          </div>
        </div>

        {/* Progress & Bonus - side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
          {/* Progress Section - wider */}
          <section className="lg:col-span-3 glass-card rounded-xl p-4 lg:p-6 space-y-4">
            <h2 className="text-sm lg:text-base font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Fortschritt zum Gold-Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge
                  className={
                    isGold
                      ? "bg-accent text-accent-foreground gold-glow"
                      : "bg-secondary text-secondary-foreground"
                  }
                >
                  <Award className="h-3 w-3 mr-1" />
                  {isGold ? "Gold-Status aktiv" : "Starter"}
                </Badge>
                <span className="text-xs lg:text-sm text-muted-foreground">
                  {isGold
                    ? "25% auf alles – Glückwunsch! 🎉"
                    : `Noch ${(GOLD_THRESHOLD - umsatz).toLocaleString("de-DE")}€ bis Gold-Status`}
                </span>
              </div>
              <Progress value={progressPct} className="h-3 lg:h-4 [&>div]:bg-accent" />
              <div className="flex justify-between text-[10px] lg:text-xs text-muted-foreground">
                <span>0€</span>
                <span>2.000€ = Gold-Status (25%)</span>
              </div>
            </div>
          </section>

          {/* Bonus Model + Streak - full width */}
        </div>

        <section className="glass-card rounded-xl p-4 lg:p-6 space-y-5">
          <h2 className="text-sm lg:text-base font-semibold text-foreground">Bonus-Modell</h2>

          {/* Tier cards with visual indicator */}
          <div className="space-y-2">
            {/* Account Upgrade - Tier 1 */}
            <div className="relative rounded-xl overflow-hidden border border-accent/30 bg-accent/5 p-4 lg:p-5">
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
            </div>

            {/* Gold - Tier 2 */}
            <div className={`relative rounded-xl overflow-hidden border p-4 lg:p-5 transition-all ${isGold ? "border-accent/40 gold-border-glow bg-accent/10" : "border-border bg-secondary/30"}`}>
              {isGold && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
              )}
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
            </div>

            {/* Starter - Tier 3 */}
            <div className={`relative rounded-xl overflow-hidden border p-4 lg:p-5 transition-all ${!isGold ? "border-border bg-secondary/50" : "border-border/50 bg-secondary/20"}`}>
              {!isGold && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
              )}
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

          {/* Integrated Streak Tracker */}
          <div className="border-t border-border pt-5">
            <StreakTracker dailyRevenue={umsatz} />
          </div>
        </section>
      </main>

      <DashboardChat />
    </div>
  );
}
