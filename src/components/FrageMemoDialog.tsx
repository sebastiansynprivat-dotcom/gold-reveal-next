import { useState, useEffect } from "react";
import GoldenAudioPlayer from "@/components/GoldenAudioPlayer";

interface FrageMemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FrageMemoDialog({ open, onOpenChange }: FrageMemoDialogProps) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (open) setKey((k) => k + 1);
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={() => onOpenChange(false)}
      />

      {/* Card positioned above chat button area */}
      <div className="fixed z-50 bottom-28 right-4 sm:right-6 pointer-events-none">
        <div className="pointer-events-auto w-72 animate-scale-in">
          {/* Card */}
          <div className="rounded-2xl bg-card/95 backdrop-blur-xl border border-accent/20 shadow-[0_8px_60px_-12px_hsl(var(--accent)/0.25)] overflow-hidden">
            {/* Top accent line */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

            <div className="p-5 space-y-4">
              <GoldenAudioPlayer key={key} src="/audio/frage-info.mp3" autoPlay />

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
