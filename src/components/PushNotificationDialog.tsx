import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Bell } from "lucide-react";
import { subscribeToPush, isPushSubscribed } from "@/lib/pushNotifications";
import { toast } from "sonner";

const PUSH_DIALOG_KEY = "push_notification_dialog_seen";

export default function PushNotificationDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (!isStandalone) return;

    const alreadySeen = localStorage.getItem(PUSH_DIALOG_KEY);
    if (alreadySeen) return;

    isPushSubscribed().then((subscribed) => {
      if (!subscribed) {
        const timer = setTimeout(() => setOpen(true), 1500);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  const handleActivate = async () => {
    setLoading(true);
    const ok = await subscribeToPush();
    setLoading(false);
    if (ok) {
      toast.success("Benachrichtigungen aktiviert! 🔔");
      handleClose();
    } else {
      toast.error("Benachrichtigungen konnten nicht aktiviert werden.");
    }
  };

  const handleClose = () => {
    localStorage.setItem(PUSH_DIALOG_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="glass-card gold-border-glow max-w-sm mx-auto p-0 overflow-hidden gap-0">
        {/* Gold accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />

        <div className="px-5 pt-5 pb-2">
          <DialogHeader className="space-y-3">
            {/* Icon */}
            <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center gold-glow">
              <Bell className="h-5 w-5 text-accent" />
            </div>
            <DialogTitle className="text-center text-base font-bold text-foreground">
              Benachrichtigungen aktivieren
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground leading-relaxed">
              Verpasse keine wichtigen Updates – wir benachrichtigen dich bei Account-Upgrades, neuen Features und Team-Nachrichten.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-border/50" />

        {/* CTA area */}
        <div className="px-5 pt-4 pb-5 space-y-3">
          <button
            onClick={handleActivate}
            disabled={loading}
            className="w-full h-11 rounded-xl bg-accent text-accent-foreground font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 gold-glow flex items-center justify-center gap-2"
          >
            <Bell className="h-4 w-4" />
            {loading ? "Wird aktiviert..." : "Jetzt aktivieren"}
          </button>
          <button
            onClick={handleClose}
            className="w-full text-[11px] text-muted-foreground hover:text-foreground text-center transition-colors py-1"
          >
            Später
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
