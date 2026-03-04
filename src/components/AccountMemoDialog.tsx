import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mic, Pause, Play } from "lucide-react";

interface AccountMemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AccountMemoDialog({ open, onOpenChange }: AccountMemoDialogProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (open) {
      setPlaying(false);
      setProgress(0);
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
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <audio ref={audioRef} src="/audio/account-memo.mp3" preload="metadata" />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-card gold-border-glow max-w-sm mx-auto p-0 overflow-hidden gap-0">
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />
          
          <div className="px-5 pt-5 pb-5">
            <DialogHeader className="space-y-2 mb-4">
              <DialogTitle className="text-center text-base font-bold text-gold-gradient">
                Sprachmemo
              </DialogTitle>
              <DialogDescription className="sr-only">Audio-Nachricht abspielen</DialogDescription>
            </DialogHeader>

            {/* Audio player */}
            <div className="glass-card-subtle rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                {/* Play button */}
                <button
                  onClick={togglePlay}
                  className="w-11 h-11 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0 hover:bg-accent/25 active:scale-95 transition-all"
                >
                  {playing ? (
                    <Pause className="h-5 w-5 text-accent" />
                  ) : (
                    <Play className="h-5 w-5 text-accent ml-0.5" />
                  )}
                </button>

                {/* Waveform / progress */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {audioRef.current ? formatTime(audioRef.current.currentTime) : "0:00"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {duration ? formatTime(duration) : "–:––"}
                    </span>
                  </div>
                </div>

                <Mic className="h-4 w-4 text-accent/50 shrink-0" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
