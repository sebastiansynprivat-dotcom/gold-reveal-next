import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import StepBadge from "./StepBadge";

const ease = [0.16, 1, 0.3, 1] as const;

/** Seconds the iframe must be visible before auto-completing */
const VIEW_THRESHOLD = 45;

interface LoomVideoStepProps {
  step: number;
  title: string;
  embedUrl: string;
  completed: boolean;
  onAutoComplete: (step: number) => void;
  animDelay: number;
}

const LoomVideoStep = ({
  step,
  title,
  embedUrl,
  completed,
  onAutoComplete,
  animDelay,
}: LoomVideoStepProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const completedRef = useRef(false);
  const viewTimeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!completed) {
      completedRef.current = false;
      viewTimeRef.current = 0;
    }
  }, [completed]);

  // Loom postMessage tracking (works on published URL)
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      const msg = event.data;

      if (msg.event === "ready" && iframeRef.current?.contentWindow) {
        ["timeupdate", "ended"].forEach((evt) => {
          iframeRef.current!.contentWindow!.postMessage(
            { method: "addEventListener", value: evt, context: "player.js" },
            "*"
          );
        });
        return;
      }

      if (completedRef.current) return;

      if (msg.event === "ended" || (msg.event === "timeupdate" && msg.data?.percent >= 0.9)) {
        completedRef.current = true;
        onAutoComplete(step);
      }
    },
    [onAutoComplete, step]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // Fallback: IntersectionObserver – track cumulative view time
  useEffect(() => {
    if (completed) return;
    const el = iframeRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !completedRef.current) {
          // Start counting
          if (!intervalRef.current) {
            intervalRef.current = setInterval(() => {
              viewTimeRef.current += 1;
              if (viewTimeRef.current >= VIEW_THRESHOLD && !completedRef.current) {
                completedRef.current = true;
                onAutoComplete(step);
                if (intervalRef.current) clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            }, 1000);
          }
        } else {
          // Pause counting when not visible
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [completed, onAutoComplete, step]);

  return (
    <motion.div
      className={`transition-opacity duration-300 ${completed ? "opacity-60" : ""}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animDelay, duration: 0.8, ease }}
    >
      <div className="flex items-center justify-center gap-3 mb-4">
        <StepBadge step={step} completed={completed} />
        <h2
          className="gold-gradient-text text-xl md:text-2xl font-bold"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {title}
        </h2>
      </div>
      <div className="gold-border-glow rounded-xl overflow-hidden">
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            ref={iframeRef}
            src={embedUrl}
            frameBorder="0"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default LoomVideoStep;
