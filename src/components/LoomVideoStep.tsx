import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StepBadge from "./StepBadge";
import { CheckCircle2 } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

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
  const [showConfirm, setShowConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!completed) completedRef.current = false;
  }, [completed]);

  // Try Loom postMessage tracking
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

      if (msg.event === "ended") {
        completedRef.current = true;
        onAutoComplete(step);
        return;
      }

      if (
        msg.event === "timeupdate" &&
        typeof msg.data?.percent === "number" &&
        msg.data.percent >= 0.9
      ) {
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

  // Fallback: show "Video geschaut" button after 30 seconds
  useEffect(() => {
    if (completed || showConfirm) return;
    timerRef.current = setTimeout(() => {
      if (!completedRef.current) {
        setShowConfirm(true);
      }
    }, 30000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [completed, showConfirm]);

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
      <AnimatePresence>
        {showConfirm && !completed && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease }}
            onClick={() => {
              completedRef.current = true;
              onAutoComplete(step);
              setShowConfirm(false);
            }}
            className="mt-3 mx-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Video geschaut ✓
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LoomVideoStep;
