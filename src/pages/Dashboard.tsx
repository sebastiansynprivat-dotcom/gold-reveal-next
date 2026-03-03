import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Save, CheckCircle2, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import DashboardChat from "@/components/DashboardChat";
import logo from "@/assets/logo.png";

const GOLD_THRESHOLD = 2000;
const STARTER_RATE = 0.2;
const GOLD_RATE = 0.25;

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const platform = searchParams.get("platform") || "Brezzels";

  // Telegram ID
  const [telegramId, setTelegramId] = useState(() => localStorage.getItem("telegram_id") || "");
  const [telegramSaved, setTelegramSaved] = useState(!!localStorage.getItem("telegram_id"));

  const saveTelegram = () => {
    localStorage.setItem("telegram_id", telegramId);
    setTelegramSaved(true);
    toast.success("Telegram-ID gespeichert!");
  };

  // Earnings
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
        <div className="container max-w-lg mx-auto flex items-center gap-3 p-4">
          <img src={logo} alt="Logo" className="h-10 w-10 rounded-full" />
          <div>
            <h1 className="text-lg font-bold text-foreground">Chatter Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              Aktiv auf: <span className="text-gold-gradient font-semibold">{platform}</span>
            </p>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto p-4 space-y-6">
        {/* Telegram ID */}
        <section className="glass-card rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Telegram ID hinterlegen
            {telegramSaved && <CheckCircle2 className="h-4 w-4 text-accent" />}
          </h2>
          <div className="flex gap-2">
            <Input
              value={telegramId}
              onChange={(e) => { setTelegramId(e.target.value); setTelegramSaved(false); }}
              placeholder="@dein_username"
              className="flex-1"
            />
            <Button onClick={saveTelegram} size="sm" disabled={!telegramId.trim()}>
              <Save className="h-4 w-4 mr-1" /> Speichern
            </Button>
          </div>
        </section>

        {/* Earnings Dashboard */}
        <section className="glass-card rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" /> Earnings Dashboard
          </h2>

          {/* Umsatz Input */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Umsatz eingeben (zum Testen)</label>
            <Input
              type="number"
              min={0}
              step={50}
              value={umsatz || ""}
              onChange={(e) => setUmsatz(Number(e.target.value) || 0)}
              placeholder="0"
              className="font-semibold"
            />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card-subtle rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Umsatz</p>
              <p className="text-xl font-bold text-gold-gradient">
                {umsatz.toLocaleString("de-DE")}€
              </p>
            </div>
            <div className="glass-card-subtle rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Verdienst ({Math.round(rate * 100)}%)</p>
              <p className="text-xl font-bold text-gold-gradient">
                {verdienst.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
              </p>
            </div>
          </div>

          {/* Status & Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge
                className={
                  isGold
                    ? "bg-accent text-accent-foreground gold-glow"
                    : "bg-secondary text-secondary-foreground"
                }
              >
                <Award className="h-3 w-3 mr-1" />
                {isGold ? "Gold-Status" : "Starter"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {isGold
                  ? "25% auf alles – Glückwunsch! 🎉"
                  : `Noch ${(GOLD_THRESHOLD - umsatz).toLocaleString("de-DE")}€ bis Gold-Status`}
              </span>
            </div>
            <Progress value={progressPct} className="h-3 [&>div]:bg-accent" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0€</span>
              <span>2.000€ = Gold-Status (25%)</span>
            </div>
          </div>

          {/* Bonus Table */}
          <div className="rounded-lg border border-border overflow-hidden text-sm">
            <div className={`flex items-center justify-between px-3 py-2 ${!isGold ? "bg-secondary" : ""}`}>
              <span className="text-muted-foreground">Starter</span>
              <span>0€ – 1.999€</span>
              <span className="font-semibold">20%</span>
            </div>
            <div className={`flex items-center justify-between px-3 py-2 border-t border-border ${isGold ? "bg-accent/10 gold-border-glow" : ""}`}>
              <span className="text-gold-gradient font-semibold">Gold-Status</span>
              <span>Ab 2.000€</span>
              <span className="font-bold text-gold-gradient">25%</span>
            </div>
          </div>
        </section>
      </main>

      {/* AI Chat */}
      <DashboardChat />
    </div>
  );
}
