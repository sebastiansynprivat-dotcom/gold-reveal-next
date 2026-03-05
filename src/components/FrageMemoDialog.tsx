import { useState, useRef, useEffect } from "react";
import { Mic, Pause, Play, ArrowDown } from "lucide-react";

interface FrageMemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FrageMemoDialog({ open, onOpenChange }: FrageMemoDialogProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Auto-play when opened
  useEffect(() => {
    if (open) {
      setPlaying(false);
      setProgress(0);
      // Small delay so DOM is ready
      setTimeout(() => {
        audioRef.current?.play().then(() => setPlaying(true)).catch(() => {});
      }, 200);
    } else {
      audioRef.current?.pause();
      setPlaying(false);
    }
  }, [open]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => { setPlaying(false); setProgress(100); };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause(); else audio.play();
    setPlaying(!playing);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!open) return <audio ref={audioRef} src="/audio/frage-info.mp3" preload="metadata" />;

  return (
    <>
      <audio ref={audioRef} src="/audio/frage-info.mp3" preload="metadata" />

      {/* Subtle backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange(false)}
      />

      {/* Floating card – positioned above the chat button */}
      <div className="fixed z-50 bottom-24 right-4 sm:right-6 w-[calc(100%-2rem)] sm:w-[340px] animate-scale-in">
        <div className="glass-card rounded-2xl border border-accent/20 p-4 space-y-3 shadow-2xl">
          {/* Title */}
          <p className="text-sm font-semibold text-foreground text-center">
            Ich habe eine Frage
          </p>

          {/* Audio player */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0 hover:bg-accent/25 active:scale-95 transition-all"
            >
              {playing ? (
                <Pause className="h-4 w-4 text-accent" />
              ) : (
                <Play className="h-4 w-4 text-accent ml-0.5" />
              )}
            </button>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] text-muted-foreground">
                  {audioRef.current ? formatTime(audioRef.current.currentTime) : "0:00"}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {duration ? formatTime(duration) : "–:––"}
                </span>
              </div>
            </div>
            <Mic className="h-3.5 w-3.5 text-accent/40 shrink-0" />
          </div>
        </div>

        {/* Arrow pointing down to chat button */}
        <div className="flex justify-end pr-4 sm:pr-5 mt-1">
          <div className="flex flex-col items-center gap-0.5 animate-bounce">
            <span className="text-[10px] text-accent font-medium">Chat öffnen</span>
            <ArrowDown className="h-5 w-5 text-accent" />
          </div>
        </div>
      </div>
    </>
  );
}
