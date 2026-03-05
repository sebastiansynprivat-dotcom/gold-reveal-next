import { useState, useRef, useEffect } from "react";
import { ArrowDown } from "lucide-react";

interface FrageMemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FrageMemoDialog({ open, onOpenChange }: FrageMemoDialogProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (open) {
      setPlaying(false);
      setProgress(0);
      setTimeout(() => {
        audioRef.current?.play().then(() => setPlaying(true)).catch(() => {});
      }, 300);
    } else {
      audioRef.current?.pause();
      setPlaying(false);
    }
  }, [open]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => { if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100); };
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => { setPlaying(false); setProgress(100); };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause(); else audio.play();
    setPlaying(!playing);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  if (!open) return <audio ref={audioRef} src="/audio/frage-info.mp3" preload="metadata" />;

  return (
    <>
      <audio ref={audioRef} src="/audio/frage-info.mp3" preload="metadata" />

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={() => onOpenChange(false)}
      />

      {/* Card positioned above chat button area */}
      <div className="fixed z-50 bottom-28 right-4 sm:right-6 pointer-events-none">
        <div className="pointer-events-auto w-72 animate-scale-in">
          {/* Card */}
          <div className="rounded-2xl bg-card/95 backdrop-blur-xl border border-border/60 shadow-[0_8px_60px_-12px_hsl(var(--accent)/0.25)] overflow-hidden">
            {/* Top accent line */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

            <div className="p-5 space-y-4">
              {/* Waveform button */}
              <button
                onClick={togglePlay}
                className="w-full flex items-center gap-3 group"
              >
                {/* Animated ring */}
                <div className="relative shrink-0">
                  <div className={`w-11 h-11 rounded-full border-2 transition-colors duration-300 flex items-center justify-center ${playing ? "border-accent bg-accent/10" : "border-border bg-secondary/50"}`}>
                    {playing ? (
                      <div className="flex items-center gap-[3px]">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="w-[3px] rounded-full bg-accent"
                            style={{
                              animation: `barBounce 0.8s ease-in-out ${i * 0.15}s infinite`,
                              height: "12px",
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <svg className="w-4 h-4 text-muted-foreground ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </div>
                  {playing && (
                    <div className="absolute inset-0 rounded-full border-2 border-accent/30 animate-ping" />
                  )}
                </div>

                {/* Progress + time */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="relative h-1 rounded-full bg-border/80 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {audioRef.current ? fmt(audioRef.current.currentTime) : "0:00"}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {duration ? fmt(duration) : "–:––"}
                    </span>
                  </div>
                </div>
              </button>

              {/* Hint text */}
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                Tippe auf den Chat-Button unten rechts
              </p>
            </div>

            {/* Bottom accent line */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          </div>

          {/* Clean straight arrow to chat button */}
          <div className="flex justify-end mr-5 mt-2">
            <div
              className="flex flex-col items-center"
              style={{ animation: "arrowSlideIn 0.5s ease-out 0.4s both" }}
            >
              <div className="w-[2.5px] h-10 rounded-full bg-accent/50" />
              <svg
                width="16" height="10" viewBox="0 0 16 10" fill="none"
                className="-mt-px"
                style={{ animation: "arrowBob 2s ease-in-out 1s infinite" }}
              >
                <path
                  d="M2 2 L8 8 L14 2"
                  stroke="hsl(var(--accent))"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.6"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes barBounce {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        @keyframes arrowSlideIn {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes arrowBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
      `}</style>
    </>
  );
}
