import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, BarChart3, Users, FileText, ListChecks, Trophy, ArrowRight, Sparkles } from "lucide-react";

const ONBOARDING_KEY = "dashboard_onboarding_seen";

interface TourStep {
  selector: string;
  title: string;
  description: string;
  icon: React.ElementType;
  position: "top" | "bottom";
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="revenue-input"]',
    title: "Umsatz eintragen",
    description: "Hier trägst du jeden Tag deinen Umsatz ein. Das ist die Grundlage für deine Vergütung und deinen Bonus-Status.",
    icon: Zap,
    position: "bottom",
  },
  {
    selector: '[data-tour="stats-cards"]',
    title: "Deine Statistiken",
    description: "Hier siehst du deinen gestrigen Umsatz, Monatsumsatz, Gesamtumsatz und deinen aktuellen Verdienst auf einen Blick.",
    icon: BarChart3,
    position: "bottom",
  },
  {
    selector: '[data-tour="revenue-chart"]',
    title: "Umsatz-Chart",
    description: "Dein Umsatzverlauf der letzten 7 Tage als Diagramm. So erkennst du deine Fortschritte schnell.",
    icon: BarChart3,
    position: "bottom",
  },
  {
    selector: '[data-section="accounts"]',
    title: "Dein Account",
    description: "Hier findest du deine Zugangsdaten (E-Mail, Passwort, Domain) und den Google Drive Zugang.",
    icon: Users,
    position: "top",
  },
  {
    selector: '[data-tour="massdm"]',
    title: "MassDM Generator",
    description: "Hier generierst du automatisch MassDM-Nachrichten, die du zum Chatten nutzen kannst.",
    icon: FileText,
    position: "top",
  },
  {
    selector: '[data-tour="checklist"]',
    title: "Tägliche Aufgaben",
    description: "Deine tägliche Checkliste – hake ab, was du erledigt hast, um den Überblick zu behalten.",
    icon: ListChecks,
    position: "top",
  },
  {
    selector: '[data-section="bonus"]',
    title: "Bonusmodell",
    description: "Je mehr Umsatz du machst, desto höher steigt deine Rate. Hier siehst du alle Stufen und deinen Fortschritt.",
    icon: Trophy,
    position: "top",
  },
];

interface DashboardOnboardingProps {
  isFirstLogin: boolean;
}

export default function DashboardOnboarding({ isFirstLogin }: DashboardOnboardingProps) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [highlight, setHighlight] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!isFirstLogin) return;
    const seen = localStorage.getItem(ONBOARDING_KEY);
    if (seen) return;
    // Delay start to let dashboard render
    const timer = setTimeout(() => setActive(true), 2000);
    return () => clearTimeout(timer);
  }, [isFirstLogin]);

  const updateHighlight = useCallback(() => {
    if (!active) return;
    const currentStep = TOUR_STEPS[step];
    if (!currentStep) return;
    const el = document.querySelector(currentStep.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setHighlight(rect);
      // Scroll element into view
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setHighlight(null);
    }
  }, [active, step]);

  useEffect(() => {
    updateHighlight();
    // Also update on scroll/resize
    const onUpdate = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateHighlight);
    };
    window.addEventListener("scroll", onUpdate, true);
    window.addEventListener("resize", onUpdate);
    return () => {
      window.removeEventListener("scroll", onUpdate, true);
      window.removeEventListener("resize", onUpdate);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateHighlight]);

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setActive(false);
  };

  if (!active) return null;

  const currentStep = TOUR_STEPS[step];
  const Icon = currentStep.icon;
  const padding = 8;

  return (
    <AnimatePresence>
      {active && (
        <div className="fixed inset-0 z-[9999]" onClick={(e) => e.stopPropagation()}>
          {/* Dark overlay with cutout */}
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
            <defs>
              <mask id="tour-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {highlight && (
                  <rect
                    x={highlight.left - padding}
                    y={highlight.top - padding}
                    width={highlight.width + padding * 2}
                    height={highlight.height + padding * 2}
                    rx="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0" y="0" width="100%" height="100%"
              fill="rgba(0,0,0,0.75)"
              mask="url(#tour-mask)"
              style={{ pointerEvents: "all" }}
              onClick={handleClose}
            />
          </svg>

          {/* Highlight border glow */}
          {highlight && (
            <div
              className="absolute rounded-xl border-2 border-accent shadow-[0_0_20px_hsl(var(--accent)/0.4)] pointer-events-none transition-all duration-300"
              style={{
                left: highlight.left - padding,
                top: highlight.top - padding,
                width: highlight.width + padding * 2,
                height: highlight.height + padding * 2,
              }}
            />
          )}

          {/* Tooltip card */}
          {highlight && (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: currentStep.position === "bottom" ? -12 : 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute z-10 w-[min(340px,calc(100vw-2rem))]"
              style={{
                left: Math.max(16, Math.min(highlight.left + highlight.width / 2 - 170, window.innerWidth - 356)),
                ...(currentStep.position === "bottom"
                  ? { top: highlight.top + highlight.height + padding + 16 }
                  : { bottom: window.innerHeight - highlight.top + padding + 16 }),
              }}
            >
              <div className="glass-card border-accent/30 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                {/* Progress dots */}
                <div className="flex items-center gap-1.5 mb-3">
                  {TOUR_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === step ? "w-6 bg-accent" : i < step ? "w-1.5 bg-accent/50" : "w-1.5 bg-muted-foreground/30"
                      }`}
                    />
                  ))}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {step + 1}/{TOUR_STEPS.length}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground mb-1">{currentStep.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{currentStep.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="text-xs text-muted-foreground h-8"
                  >
                    Überspringen
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="ml-auto h-8 text-xs gap-1.5"
                  >
                    {step < TOUR_STEPS.length - 1 ? (
                      <>
                        Weiter <ArrowRight className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" /> Los geht's!
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
