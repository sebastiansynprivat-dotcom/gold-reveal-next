import { useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

interface VideoThumbnailProps {
  embedUrl: string;
  onVideoProgress?: (percent: number) => void;
  onVideoEnd?: () => void;
}

const VideoThumbnail = ({ embedUrl, onVideoProgress, onVideoEnd }: VideoThumbnailProps) => {
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
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  return (
    <div className="relative w-full gold-border-glow rounded-xl overflow-hidden" style={{ paddingBottom: "56.25%" }}>
      <motion.iframe
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
    </div>
  );
};

export default VideoThumbnail;
