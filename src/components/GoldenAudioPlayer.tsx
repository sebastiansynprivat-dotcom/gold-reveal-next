import { useState, useRef, useEffect } from "react";

interface GoldenAudioPlayerProps {
  src: string;
  autoPlay?: boolean;
}

export default function GoldenAudioPlayer({ src, autoPlay }: GoldenAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = 1.5;
    const onTime = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => { setPlaying(false); setProgress(100); };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    if (autoPlay) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [autoPlay]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = 1.5;
    if (playing) audio.pause(); else audio.play();
    setPlaying(!playing);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  return (
    <>
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="rounded-xl bg-card/95 backdrop-blur-xl border border-accent/20 shadow-[0_4px_30px_-8px_hsl(var(--accent)/0.2)] overflow-hidden">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
        <div className="p-3.5">
          <button onClick={togglePlay} className="w-full flex items-center gap-3 group">
            <div className="relative shrink-0">
              <div
                className={`w-10 h-10 rounded-full border-2 transition-colors duration-300 flex items-center justify-center ${
                  playing
                    ? "border-accent bg-accent/10"
                    : "border-accent/30 bg-secondary/50"
                }`}
              >
                {playing ? (
                  <div className="flex items-center gap-[3px]">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-[3px] rounded-full bg-accent"
                        style={{
                          animation: `goldenBarBounce 0.8s ease-in-out ${i * 0.15}s infinite`,
                          height: "12px",
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <svg
                    className="w-4 h-4 text-accent ml-0.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
              {playing && (
                <div className="absolute inset-0 rounded-full border-2 border-accent/30 animate-ping" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="relative h-1.5 rounded-full bg-accent/10 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {audioRef.current
                    ? fmt(audioRef.current.currentTime / 1.5)
                    : "0:00"}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {duration ? fmt(duration / 1.5) : "–:––"}
                </span>
              </div>
            </div>
          </button>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      </div>
      <style>{`
        @keyframes goldenBarBounce {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </>
  );
}
