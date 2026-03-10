import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, FileText, ListChecks, Trophy, ArrowRight, Sparkles } from "lucide-react";

const ONBOARDING_KEY = "dashboard_onboarding_seen";

interface TourStep {
  selector: string;
  title: string;
  description: string;
  icon: React.ElementType;
  maxHeight?: number;
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="stats-cards"]',
    title: "Deine Statistiken",
    description: "Hier siehst du deinen gestrigen Umsatz, Monatsumsatz, Gesamtumsatz und deinen aktuellen Verdienst auf einen Blick.",
    icon: BarChart3,
  },
  {
    selector: '[data-tour="revenue-chart"]',
    title: "Umsatz-Chart",
    description: "Dein Umsatzverlauf der letzten 7 Tage als Diagramm. So erkennst du deine Fortschritte schnell.",
    icon: BarChart3,
  },
  {
    selector: '[data-section="accounts"]',
    title: "Dein Account",
    description: "Hier findest du deine Zugangsdaten (E-Mail, Passwort, Domain) und den Google Drive Zugang.",
    icon: Users,
  },
  {
    selector: '[data-tour="massdm"]',
    title: "MassDM Generator",
    description: "Hier generierst du automatisch MassDM-Nachrichten, die du zum Chatten nutzen kannst.",
    icon: FileText,
  },
  {
    selector: '[data-tour="checklist"]',
    title: "Tägliche Aufgaben",
    description: "Deine tägliche Checkliste – hake ab, was du erledigt hast, um den Überblick zu behalten.",
    icon: ListChecks,
  },
  {
    selector: '[data-section="bonus"]',
    title: "Bonusmodell",
    description: "Je mehr Umsatz du machst, desto höher steigt deine Rate. Hier siehst du alle Stufen und deinen Fortschritt.",
    icon: Trophy,
    maxHeight: 120,
  },
];

interface Rect { left: number; top: number; width: number; height: number; }

interface DashboardOnboardingProps {
  isFirstLogin: boolean;
  manualOpen?: boolean;
  onManualClose?: () => void;
}

export default function DashboardOnboarding({ isFirstLogin, manualOpen, onManualClose }: DashboardOnboardingProps) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const rafRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFirstLogin) return;
    const seen = localStorage.getItem(ONBOARDING_KEY);
    if (seen) return;
    const timer = setTimeout(() => setActive(true), 2000);
    return () => clearTimeout(timer);
  }, [isFirstLogin]);

  useEffect(() => {
    if (manualOpen) {
      setStep(0);
      setRect(null);
      setActive(true);
    }
  }, [manualOpen]);

  const measureElement = useCallback((stepIndex: number) => {
    const s = TOUR_STEPS[stepIndex];
    if (!s) return null;
    const el = document.querySelector(s.selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const maxH = s.maxHeight || window.innerHeight * 0.55;
    const clampedH = Math.min(r.height, maxH);
    return { left: r.left, top: r.top, width: r.width, height: clampedH };
  }, []);

  const scrollToStep = useCallback((stepIndex: number) => {
    const s = TOUR_STEPS[stepIndex];
    if (!s) return;
    const el = document.querySelector(s.selector);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // On step change: scroll first, then measure after scroll settles
  useEffect(() => {
    if (!active) return;
    setIsTransitioning(true);

    scrollToStep(step);

    // Wait for scroll to settle, then measure
    const timer = setTimeout(() => {
      const measured = measureElement(step);
      if (measured) setRect(measured);
      setIsTransitioning(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [active, step, scrollToStep, measureElement]);

  // Keep rect updated on scroll/resize
  useEffect(() => {
    if (!active) return;
    const onUpdate = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const measured = measureElement(step);
        if (measured) setRect(measured);
      });
    };
    window.addEventListener("scroll", onUpdate, true);
    window.addEventListener("resize", onUpdate);
    return () => {
      window.removeEventListener("scroll", onUpdate, true);
      window.removeEventListener("resize", onUpdate);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, step, measureElement]);

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
    onManualClose?.();
    // Scroll to accounts section
    setTimeout(() => {
      const el = document.querySelector('[data-section="accounts"]');
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  if (!active) return null;

  const currentStep = TOUR_STEPS[step];
  const Icon = currentStep.icon;
  const pad = 10;

  // Calculate tooltip position: prefer below, if not enough space go above
  const getTooltipStyle = (): React.CSSProperties => {
    if (!rect) return { opacity: 0 };
    const tooltipH = 200;
    const spaceBelow = window.innerHeight - (rect.top + rect.height + pad);
    const spaceAbove = rect.top - pad;
    const leftPos = Math.max(12, Math.min(rect.left + rect.width / 2 - 170, window.innerWidth - 352));

    if (spaceBelow >= tooltipH + 20) {
      return { left: leftPos, top: rect.top + rect.height + pad + 12 };
    } else if (spaceAbove >= tooltipH + 20) {
      return { left: leftPos, bottom: window.innerHeight - rect.top + pad + 12 };
    }
    // Fallback: center vertically
    return { left: leftPos, top: Math.max(20, window.innerHeight / 2 - tooltipH / 2) };
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999]" style={{ pointerEvents: "auto" }}>
      {/* 4 overlay panels around the highlight – smooth CSS transitions */}
      {rect ? (
        <>
          {/* Top */}
          <div
            className="absolute left-0 right-0 top-0 bg-black/70 backdrop-blur-[1px]"
            style={{ height: Math.max(0, rect.top - pad), transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
            onClick={handleClose}
          />
          {/* Bottom */}
          <div
            className="absolute left-0 right-0 bottom-0 bg-black/70 backdrop-blur-[1px]"
            style={{ height: Math.max(0, window.innerHeight - rect.top - rect.height - pad), transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
            onClick={handleClose}
          />
          {/* Left */}
          <div
            className="absolute left-0 bg-black/70 backdrop-blur-[1px]"
            style={{
              top: rect.top - pad,
              height: rect.height + pad * 2,
              width: Math.max(0, rect.left - pad),
              transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onClick={handleClose}
          />
          {/* Right */}
          <div
            className="absolute right-0 bg-black/70 backdrop-blur-[1px]"
            style={{
              top: rect.top - pad,
              height: rect.height + pad * 2,
              left: rect.left + rect.width + pad,
              transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onClick={handleClose}
          />

          {/* Highlight border */}
          <div
            className="absolute rounded-xl border-2 border-accent/80 pointer-events-none"
            style={{
              left: rect.left - pad,
              top: rect.top - pad,
              width: rect.width + pad * 2,
              height: rect.height + pad * 2,
              boxShadow: "0 0 24px hsl(var(--accent) / 0.35), inset 0 0 24px hsl(var(--accent) / 0.08)",
              transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px]" onClick={handleClose} />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        {rect && !isTransitioning && (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            className="absolute z-10 w-[min(340px,calc(100vw-1.5rem))]"
            style={getTooltipStyle()}
          >
            <div className="glass-card border-accent/30 rounded-2xl p-5 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
              {/* Progress bar */}
              <div className="flex items-center gap-1.5 mb-3">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full"
                    style={{
                      width: i === step ? 24 : 6,
                      backgroundColor: i === step
                        ? "hsl(var(--accent))"
                        : i < step
                        ? "hsl(var(--accent) / 0.5)"
                        : "hsl(var(--muted-foreground) / 0.25)",
                      transition: "all 0.4s ease",
                    }}
                  />
                ))}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {step + 1}/{TOUR_STEPS.length}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <motion.div
                  key={step}
                  initial={{ scale: 0.5, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0"
                >
                  <Icon className="h-4 w-4 text-accent" />
                </motion.div>
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
                  className="text-xs text-muted-foreground h-8 hover:text-foreground"
                >
                  Überspringen
                </Button>
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="ml-auto h-8 text-xs gap-1.5 min-w-[100px]"
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
      </AnimatePresence>
    </div>
  );
}
