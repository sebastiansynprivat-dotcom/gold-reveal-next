import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import GoldenAudioPlayer from "@/components/GoldenAudioPlayer";

interface AccountMemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AccountMemoDialog({ open, onOpenChange }: AccountMemoDialogProps) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (open) setKey((k) => k + 1);
  }, [open]);

  return (
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
          <GoldenAudioPlayer key={key} src="/audio/account-memo.mp3" autoPlay />
        </div>
      </DialogContent>
    </Dialog>
  );
}
