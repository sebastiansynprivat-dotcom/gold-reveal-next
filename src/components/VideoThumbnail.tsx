import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

interface VideoThumbnailProps {
  embedUrl: string;
  onVideoProgress?: (percent: number) => void;
  onVideoEnd?: () => void;
}

const VideoThumbnail = ({ embedUrl, onVideoProgress, onVideoEnd }: VideoThumbnailProps) => {
  const [playing, setPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerReadyRef = useRef(false);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (!event.origin.includes("loom.com")) return;
    try {
      const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

      if (data?.context === "player.js" && data?.event === "ready" && !playerReadyRef.current) {
        playerReadyRef.current = true;
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ context: "player.js", method: "addEventListener", value: "timeupdate" }), "*"
        );
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ context: "player.js", method: "addEventListener", value: "ended" }), "*"
        );
      }

      if (data?.context === "player.js" && data?.event === "ended") {
        onVideoEnd?.();
      }

      if (data?.context === "player.js" && data?.event === "timeupdate" && data?.value) {
        const { seconds, duration } = data.value;
        if (duration > 0) {
          onVideoProgress?.(seconds / duration);
        }
      }
    } catch {
      // Ignore
    }
  }, [onVideoProgress, onVideoEnd]);

  useEffect(() => {
    if (playing) {
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, [playing, handleMessage]);

  return (
    <div className="relative w-full gold-border-glow rounded-xl overflow-hidden" style={{ paddingBottom: "56.25%" }}>
      <AnimatePresence mode="wait">
        {!playing ? (
          <motion.button
            key="thumbnail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease }}
            onClick={() => setPlaying(true)}
            className="absolute inset-0 w-full h-full bg-gradient-to-br from-secondary via-background to-secondary flex items-center justify-center group cursor-pointer border-0 outline-none"
          >
            {/* Decorative circles */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-primary/5 animate-pulse" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full bg-primary/[0.03]" />
            </div>

            {/* Play button */}
            <motion.div
              className="relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/90 flex items-center justify-center gold-glow group-hover:gold-glow-strong group-hover:scale-110 transition-all duration-300"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Play className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground ml-1" fill="currentColor" />
            </motion.div>

            {/* Text below button */}
            <span className="absolute bottom-6 text-muted-foreground text-sm font-medium">
              ▶ Video starten
            </span>
          </motion.button>
        ) : (
          <motion.iframe
            key="video"
            ref={iframeRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease }}
            src={embedUrl}
            frameBorder="0"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoThumbnail;
