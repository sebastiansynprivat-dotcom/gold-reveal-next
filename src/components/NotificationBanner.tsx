import { useState, useEffect } from "react";
import { BellOff, Settings } from "lucide-react";
import { isPushSubscribed } from "@/lib/pushNotifications";

export default function NotificationBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only relevant in standalone PWA mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (!isStandalone) return;
    if (!("Notification" in window)) return;

    // Show banner if permission was denied AND not subscribed
    if (Notification.permission === "denied") {
      isPushSubscribed().then((subscribed) => {
        if (!subscribed) setShow(true);
      });
    }
  }, []);

  if (!show) return null;

  // Detect platform for instructions
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const instruction = isIOS
    ? "Gehe zu Einstellungen → Safari → Benachrichtigungen und erlaube sie für diese App."
    : isAndroid
    ? "Tippe auf das 🔒 Symbol in der Adressleiste → Berechtigungen → Benachrichtigungen erlauben."
    : "Öffne die Browser-Einstellungen und erlaube Benachrichtigungen für diese Seite.";

  return (
    <div className="glass-card-subtle rounded-xl p-3 lg:p-4 border border-destructive/20 bg-destructive/5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
          <BellOff className="h-4 w-4 text-destructive" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs font-semibold text-foreground">
            Benachrichtigungen sind deaktiviert
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Du verpasst wichtige Updates wie Account-Upgrades und Team-Nachrichten. Aktiviere sie in deinen Geräte-Einstellungen:
          </p>
          <div className="flex items-start gap-2 mt-1.5 p-2 rounded-lg bg-secondary/50 border border-border/30">
            <Settings className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">{instruction}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
