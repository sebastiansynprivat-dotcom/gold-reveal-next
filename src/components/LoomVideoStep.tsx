import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import StepBadge from "./StepBadge";

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

  // Reset when completed prop changes to false
  useEffect(() => {
    if (!completed) completedRef.current = false;
  }, [completed]);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      if (
        iframeRef.current &&
        event.source !== iframeRef.current.contentWindow
      )
        return;

      const msg = event.data;

      // When Loom player is ready, subscribe to events
      if (msg.event === "ready" && iframeRef.current) {
        const win = iframeRef.current.contentWindow;
        if (win) {
          ["timeupdate", "ended"].forEach((evt) => {
            win.postMessage(
              { method: "addEventListener", value: evt, context: "player.js" },
              "*"
            );
          });
        }
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
