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
    selector: '[data-tour="bonus-tiers"]',
    title: "Bonusmodell",
    description: "Je mehr Umsatz du machst, desto höher steigt deine Rate. Hier siehst du alle Stufen und deinen Fortschritt.",
    icon: Trophy,
  },
];

interface DashboardOnboardingProps {
  isFirstLogin: boolean;
  manualOpen?: boolean;
  onManualClose?: () => void;
}

// Smooth animated rect state using CSS transitions on a single overlay
export default function DashboardOnboarding({ isFirstLogin, manualOpen, onManualClose }: DashboardOnboardingProps) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  // Animated rect (smoothly interpolated)
  const [animRect, setAnimRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const targetRect = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const animating = useRef(false);
  const rafRef = useRef<number>();

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
      setShowTooltip(false);
      setActive(true);
    }
  }, [manualOpen]);

  const pad = 12;

  const measureElement = useCallback((stepIndex: number) => {
    const s = TOUR_STEPS[stepIndex];
    if (!s) return null;
    const el = document.querySelector(s.selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.left - pad,
      y: r.top - pad,
      w: r.width + pad * 2,
      h: r.height + pad * 2,
    };
  }, []);

  // Smooth lerp animation for the cutout rect
  const startAnimation = useCallback((target: { x: number; y: number; w: number; h: number }) => {
    targetRect.current = target;
    if (animating.current) return;
    animating.current = true;

    const animate = () => {
      setAnimRect(prev => {
        const lerp = 0.12;
        const t = targetRect.current;
        const nx = prev.x + (t.x - prev.x) * lerp;
        const ny = prev.y + (t.y - prev.y) * lerp;
        const nw = prev.w + (t.w - prev.w) * lerp;
        const nh = prev.h + (t.h - prev.h) * lerp;

        const done = Math.abs(t.x - nx) < 0.5 && Math.abs(t.y - ny) < 0.5 &&
                     Math.abs(t.w - nw) < 0.5 && Math.abs(t.h - nh) < 0.5;

        if (done) {
          animating.current = false;
          return t;
        }

        rafRef.current = requestAnimationFrame(animate);
        return { x: nx, y: ny, w: nw, h: nh };
      });
    };
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  // On step change: scroll, wait, measure, animate
  useEffect(() => {
    if (!active) return;
    setShowTooltip(false);

    const s = TOUR_STEPS[step];
    if (!s) return;
    const el = document.querySelector(s.selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Measure after scroll + whileInView animations settle
    const timer1 = setTimeout(() => {
      const measured = measureElement(step);
      if (measured) {
        if (step === 0 && animRect.w === 0) {
          setAnimRect(measured);
          targetRect.current = measured;
        } else {
          startAnimation(measured);
        }
      }

      // Re-measure after whileInView animations complete (e.g. motion elements)
      const timer2 = setTimeout(() => {
        const remeasured = measureElement(step);
        if (remeasured) {
          startAnimation(remeasured);
        }
        setShowTooltip(true);
      }, 350);

      return () => clearTimeout(timer2);
    }, 500);

    return () => clearTimeout(timer1);
  }, [active, step, measureElement, startAnimation]);

  // Keep measuring on scroll/resize
  useEffect(() => {
    if (!active) return;
    const onUpdate = () => {
      const measured = measureElement(step);
      if (measured) {
        targetRect.current = measured;
        if (!animating.current) {
          setAnimRect(measured);
        }
      }
    };
    window.addEventListener("scroll", onUpdate, true);
    window.addEventListener("resize", onUpdate);
    return () => {
      window.removeEventListener("scroll", onUpdate, true);
      window.removeEventListener("resize", onUpdate);
    };
  }, [active, step, measureElement]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

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
    setTimeout(() => {
      const el = document.querySelector('[data-section="accounts"]');
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  if (!active) return null;

  const currentStep = TOUR_STEPS[step];
  const Icon = currentStep.icon;
  const { x, y, w, h } = animRect;
  const r = 14; // border radius for cutout

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (w === 0) return { opacity: 0 };
    const tooltipH = 200;
    const spaceBelow = window.innerHeight - (y + h);
    const spaceAbove = y;
    const leftPos = Math.max(12, Math.min(x + w / 2 - 170, window.innerWidth - 352));

    if (spaceBelow >= tooltipH + 16) {
      return { left: leftPos, top: y + h + 12 };
    } else if (spaceAbove >= tooltipH + 16) {
      return { left: leftPos, bottom: window.innerHeight - y + 12 };
    }
    return { left: leftPos, top: Math.max(16, window.innerHeight / 2 - tooltipH / 2) };
  };

  // SVG path for overlay with rounded-rect cutout
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const overlayPath = w > 0
    ? `M0,0 L${vw},0 L${vw},${vh} L0,${vh} Z ` +
      `M${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} ` +
      `L${x + w},${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} ` +
      `L${x + r},${y + h} Q${x},${y + h} ${x},${y + h - r} ` +
      `L${x},${y + r} Q${x},${y} ${x + r},${y} Z`
    : `M0,0 L${vw},0 L${vw},${vh} L0,${vh} Z`;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Single SVG overlay with animated cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <path
          d={overlayPath}
          fill="rgba(0,0,0,0.72)"
          fillRule="evenodd"
          style={{ pointerEvents: "all", cursor: "pointer" }}
          onClick={handleClose}
        />
      </svg>

      {/* Animated gold shimmer border around cutout */}
      {w > 0 && (
        <div
          className="tour-gold-border rounded-[14px]"
          style={{
            left: x,
            top: y,
            width: w,
            height: h,
            boxShadow: "0 0 24px hsl(43 56% 52% / 0.25), 0 0 48px hsl(43 56% 52% / 0.08)",
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        {showTooltip && w > 0 && (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-10 w-[min(340px,calc(100vw-1.5rem))]"
            style={getTooltipStyle()}
          >
            <div className="glass-card border-accent/30 rounded-2xl p-5 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
              {/* Progress dots */}
              <div className="flex items-center gap-1.5 mb-3">
                {TOUR_STEPS.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      width: i === step ? 24 : 6,
                      backgroundColor: i === step
                        ? "hsl(43, 56%, 52%)"
                        : i < step
                        ? "hsl(43, 56%, 52%, 0.5)"
                        : "hsl(0, 0%, 40%, 0.25)",
                    }}
                    transition={{ duration: 0.3 }}
                    className="h-1.5 rounded-full"
                  />
                ))}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {step + 1}/{TOUR_STEPS.length}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <motion.div
                  key={step}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.08 }}
                  className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0"
                >
                  <Icon className="h-4 w-4 text-accent" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <motion.h3
                    key={step + "-title"}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.1 }}
                    className="text-sm font-bold text-foreground mb-1"
                  >
                    {currentStep.title}
                  </motion.h3>
                  <motion.p
                    key={step + "-desc"}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.15 }}
                    className="text-xs text-muted-foreground leading-relaxed"
                  >
                    {currentStep.description}
                  </motion.p>
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
                    <>Weiter <ArrowRight className="h-3 w-3" /></>
                  ) : (
                    <><Sparkles className="h-3 w-3" /> Los geht's!</>
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
