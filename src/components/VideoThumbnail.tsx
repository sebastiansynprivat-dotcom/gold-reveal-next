import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import videoThumbnail from "@/assets/video-thumbnail.jpg";

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
            className="absolute inset-0 w-full h-full cursor-pointer border-0 outline-none group flex flex-col items-center justify-center"
          >
            <img
              src={videoThumbnail}
              alt="Video starten"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-background/30 group-hover:bg-background/15 transition-colors duration-300" />
            <span className="relative z-10 gold-gradient-text text-base sm:text-lg md:text-xl font-bold text-center px-4 mb-16 sm:mb-20 leading-snug drop-shadow-lg">
              Jetzt klicken, um das kostenlose<br />Video zu starten
            </span>
            <span className="relative z-10 text-foreground/60 text-xs sm:text-sm font-medium absolute bottom-4 sm:bottom-6 group-hover:text-foreground/80 transition-colors">
              Sicher dir deinen Platz
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
