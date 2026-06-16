import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Camera,
  MessageSquare,
  Layers,
  FileText,
} from "lucide-react";

const ONBOARDING_KEY = "model_onboarding_seen";

interface TourStep {
  selector: string;
  icon: React.ElementType;
  title: { de: string; en: string };
  description: { de: string; en: string };
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="welcome"]',
    icon: Sparkles,
    title: { de: "Willkommen in deinem Dashboard", en: "Welcome to your dashboard" },
    description: {
      de: "Hier siehst du auf einen Blick, wie deine Plattformen laufen — alles an einem Ort.",
      en: "A quick overview of everything that matters for your platforms — all in one place.",
    },
  },
  {
    selector: '[data-tour="revenue"]',
    icon: TrendingUp,
    title: { de: "Deine Einnahmen", en: "Your earnings" },
    description: {
      de: "Wechsle den Zeitraum, sieh deinen Anteil und eine Monatsprognose — Orientierung, kein Stress.",
      en: "Switch periods, see your share and a month forecast — for guidance, not pressure.",
    },
  },
  {
    selector: '[data-tour="impact"]',
    icon: Camera,
    title: { de: "Was ein Set bewirken kann", en: "What a set could bring you" },
    description: {
      de: "Schieb den Regler: So viel könnten zusätzliche Sets im Monat ungefähr bringen.",
      en: "Move the slider: this is roughly what extra sets could add to your month.",
    },
  },
  {
    selector: '[data-tour="requests"]',
    icon: MessageSquare,
    title: { de: "Custom-Anfragen", en: "Custom requests" },
    description: {
      de: "Anfragen von Fans landen hier. Erfüllte Wünsche = mehr glückliche Fans = mehr Umsatz.",
      en: "Fan requests show up here. Fulfilled requests = happy fans = more revenue.",
    },
  },
  {
    selector: '[data-tour="platforms"]',
    icon: Layers,
    title: { de: "Deine Plattformen", en: "Your platforms" },
    description: {
      de: "Tippe eine Karte an, um deine Zugangsdaten zu sehen — schnell kopiert, sicher verstaut.",
      en: "Tap a card to see your credentials — easy to copy, safely stored.",
    },
  },
  {
    selector: '[data-tour="billing"]',
    icon: FileText,
    title: { de: "Abrechnungen", en: "Payouts" },
    description: {
      de: "Vergangene Auszahlungen, PDFs und der Status deiner aktuellen Abrechnung — alles hier.",
      en: "Past payouts, PDFs and the status of your current cycle — all here.",
    },
  },
];

interface Props {
  language?: "de" | "en";
  /** force-open even if seen (e.g. via help button) */
  manualOpen?: boolean;
  onManualClose?: () => void;
}

export default function ModelOnboardingTour({ language = "de", manualOpen, onManualClose }: Props) {
  const lang = language === "en" ? "en" : "de";
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [animRect, setAnimRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const targetRect = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const animating = useRef(false);
  const rafRef = useRef<number>();

  const t = {
    skip: lang === "en" ? "Skip" : "Überspringen",
    next: lang === "en" ? "Next" : "Weiter",
    done: lang === "en" ? "Let's go!" : "Los geht's!",
  };

  // Auto-open for first-time visitors
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(ONBOARDING_KEY);
    if (seen) return;
    const timer = setTimeout(() => setActive(true), 1500);
    return () => clearTimeout(timer);
  }, []);

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

  const startAnimation = useCallback((target: { x: number; y: number; w: number; h: number }) => {
    targetRect.current = target;
    if (animating.current) return;
    animating.current = true;
    const animate = () => {
      setAnimRect((prev) => {
        const lerp = 0.14;
        const tr = targetRect.current;
        const nx = prev.x + (tr.x - prev.x) * lerp;
        const ny = prev.y + (tr.y - prev.y) * lerp;
        const nw = prev.w + (tr.w - prev.w) * lerp;
        const nh = prev.h + (tr.h - prev.h) * lerp;
        const done =
          Math.abs(tr.x - nx) < 0.5 &&
          Math.abs(tr.y - ny) < 0.5 &&
          Math.abs(tr.w - nw) < 0.5 &&
          Math.abs(tr.h - nh) < 0.5;
        if (done) {
          animating.current = false;
          return tr;
        }
        rafRef.current = requestAnimationFrame(animate);
        return { x: nx, y: ny, w: nw, h: nh };
      });
    };
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (!active) return;
    setShowTooltip(false);
    const s = TOUR_STEPS[step];
    if (!s) return;
    const el = document.querySelector(s.selector);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });

    const timer = setTimeout(() => {
      const measured = measureElement(step);
      if (measured) {
        if (step === 0 && animRect.w === 0) {
          setAnimRect(measured);
          targetRect.current = measured;
        } else {
          startAnimation(measured);
        }
      }
      setTimeout(() => {
        const remeasured = measureElement(step);
        if (remeasured) startAnimation(remeasured);
        setShowTooltip(true);
      }, 350);
    }, 450);
    return () => clearTimeout(timer);
  }, [active, step, measureElement, startAnimation]);

  useEffect(() => {
    if (!active) return;
    const onUpdate = () => {
      const measured = measureElement(step);
      if (measured) {
        targetRect.current = measured;
        if (!animating.current) setAnimRect(measured);
      }
    };
    window.addEventListener("scroll", onUpdate, true);
    window.addEventListener("resize", onUpdate);
    return () => {
      window.removeEventListener("scroll", onUpdate, true);
      window.removeEventListener("resize", onUpdate);
    };
  }, [active, step, measureElement]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) setStep(step + 1);
    else handleClose();
  };

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setActive(false);
    onManualClose?.();
  };

  if (!active) return null;

  const currentStep = TOUR_STEPS[step];
  const Icon = currentStep.icon;
  const { x, y, w, h } = animRect;
  const r = 14;

  const getTooltipStyle = (): React.CSSProperties => {
    if (w === 0) return { opacity: 0 };
    const tooltipH = 200;
    const spaceBelow = window.innerHeight - (y + h);
    const spaceAbove = y;
    const leftPos = Math.max(12, Math.min(x + w / 2 - 170, window.innerWidth - 352));
    if (spaceBelow >= tooltipH + 16) return { left: leftPos, top: y + h + 12 };
    if (spaceAbove >= tooltipH + 16) return { left: leftPos, bottom: window.innerHeight - y + 12 };
    return { left: leftPos, top: Math.max(16, window.innerHeight / 2 - tooltipH / 2) };
  };

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Ensure the cutout never touches the viewport edges, so the dark veil
  // always has a visible strip on all sides (esp. top on mobile browsers).
  const minMargin = 12;
  const hy = Math.max(y, minMargin);
  const hh = Math.max(0, h - (hy - y));
  const overlayPath =
    w > 0
      ? `M0,0 L${vw},0 L${vw},${vh} L0,${vh} Z ` +
        `M${x + r},${hy} L${x + w - r},${hy} Q${x + w},${hy} ${x + w},${hy + r} ` +
        `L${x + w},${hy + hh - r} Q${x + w},${hy + hh} ${x + w - r},${hy + hh} ` +
        `L${x + r},${hy + hh} Q${x},${hy + hh} ${x},${hy + hh - r} ` +
        `L${x},${hy + r} Q${x},${hy} ${x + r},${hy} Z`
      : `M0,0 L${vw},0 L${vw},${vh} L0,${vh} Z`;

  return (
    <div className="fixed inset-0 z-[9999]">
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <path
          d={overlayPath}
          fill="rgba(0,0,0,0.72)"
          fillRule="evenodd"
          style={{ pointerEvents: "all", cursor: "pointer" }}
          onClick={handleClose}
        />
      </svg>

      {w > 0 && (
        <div
          className="tour-gold-border rounded-[14px]"
          style={{
            left: x,
            top: hy,
            width: w,
            height: hh,
            boxShadow: "0 0 24px hsl(43 56% 52% / 0.25), 0 0 48px hsl(43 56% 52% / 0.08)",
          }}
        />
      )}

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
              <div className="flex items-center gap-1.5 mb-3">
                {TOUR_STEPS.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      width: i === step ? 24 : 6,
                      backgroundColor:
                        i === step
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
                  <h3 className="text-sm font-bold text-foreground mb-1">
                    {currentStep.title[lang]}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {currentStep.description[lang]}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="text-xs text-muted-foreground h-8 hover:text-foreground"
                >
                  {t.skip}
                </Button>
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="ml-auto h-8 text-xs gap-1.5 min-w-[100px]"
                >
                  {step < TOUR_STEPS.length - 1 ? (
                    <>
                      {t.next} <ArrowRight className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" /> {t.done}
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
