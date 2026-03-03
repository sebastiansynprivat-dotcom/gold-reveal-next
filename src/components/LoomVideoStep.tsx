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
  const playerReadyRef = useRef(false);

  useEffect(() => {
    if (!completed) {
      completedRef.current = false;
      playerReadyRef.current = false;
    }
  }, [completed]);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!event.origin.includes("loom.com")) return;

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        // player.js ready – register for timeupdate + ended
        if (data?.context === "player.js" && data?.event === "ready" && !playerReadyRef.current) {
          playerReadyRef.current = true;
          const win = iframeRef.current?.contentWindow;
          if (win) {
            win.postMessage(
              JSON.stringify({ context: "player.js", method: "addEventListener", value: "timeupdate" }),
              "*"
            );
            win.postMessage(
              JSON.stringify({ context: "player.js", method: "addEventListener", value: "ended" }),
              "*"
            );
          }
          return;
        }

        if (completedRef.current) return;

        // Video ended
        if (data?.context === "player.js" && data?.event === "ended") {
          completedRef.current = true;
          onAutoComplete(step);
          return;
        }

        // timeupdate – complete at 90%
        if (data?.context === "player.js" && data?.event === "timeupdate" && data?.value) {
          const { seconds, duration } = data.value;
          if (duration > 0 && seconds / duration >= 0.9) {
            completedRef.current = true;
            onAutoComplete(step);
          }
        }
      } catch {
        // Ignore non-JSON messages
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
