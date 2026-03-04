import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, ArrowUp, Star, AlertTriangle } from "lucide-react";
import { subscribeToPush, isPushSubscribed } from "@/lib/pushNotifications";
import { toast } from "sonner";

const PUSH_DIALOG_KEY = "push_notification_dialog_seen";

export default function PushNotificationDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only show when running as installed PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (!isStandalone) return;

    const alreadySeen = localStorage.getItem(PUSH_DIALOG_KEY);
    if (alreadySeen) return;

    // Check if already subscribed
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
      toast.error("Benachrichtigungen konnten nicht aktiviert werden. Bitte erlaube sie in den Browser-Einstellungen.");
    }
  };

  const handleClose = () => {
    localStorage.setItem(PUSH_DIALOG_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="glass-card border-border max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-accent" />
            Benachrichtigungen aktivieren
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Damit du nichts Wichtiges verpasst!
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/10 border border-accent/20">
          <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Sehr wichtig!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aktiviere jetzt die Benachrichtigungen, damit du keine wichtigen Updates verpasst.
            </p>
          </div>
        </div>

        <div className="space-y-2 mt-1">
          <div className="flex items-start gap-3 p-3 glass-card-subtle rounded-xl">
            <ArrowUp className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Account-Upgrades:</span> Erfahre sofort, wenn du eine neue Stufe erreichst und einen besseren Account bekommst.
            </p>
          </div>
          <div className="flex items-start gap-3 p-3 glass-card-subtle rounded-xl">
            <Star className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Wichtige Updates:</span> Erhalte Infos zu neuen Features, Team-Nachrichten und alles was du wissen musst.
            </p>
          </div>
        </div>

        <Button onClick={handleActivate} disabled={loading} className="w-full mt-2">
          <Bell className="h-4 w-4 mr-2" />
          {loading ? "Wird aktiviert..." : "Benachrichtigungen aktivieren"}
        </Button>

        <button
          onClick={handleClose}
          className="text-xs text-muted-foreground hover:text-foreground text-center transition-colors"
        >
          Später erinnern
        </button>
      </DialogContent>
    </Dialog>
  );
}
