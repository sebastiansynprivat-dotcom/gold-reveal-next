import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeToPush, isPushSubscribed } from "@/lib/pushNotifications";
import { toast } from "sonner";

export default function NotificationBanner() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isPushSubscribed().then(setSubscribed);
  }, []);

  // Don't show if push not supported or already subscribed
  if (!("PushManager" in window) || subscribed === true) return null;
  if (subscribed === null) return null;

  const handleSubscribe = async () => {
    setLoading(true);
    const ok = await subscribeToPush();
    setLoading(false);
    if (ok) {
      setSubscribed(true);
      toast.success("Benachrichtigungen aktiviert! 🔔");
    } else {
      toast.error("Benachrichtigungen konnten nicht aktiviert werden.");
    }
  };

  return (
    <div className="glass-card-subtle rounded-xl p-3 lg:p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <BellOff className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          Aktiviere Benachrichtigungen um Updates von deinem Team zu erhalten.
        </p>
      </div>
      <Button
        size="sm"
        onClick={handleSubscribe}
        disabled={loading}
        className="shrink-0 h-7 text-xs px-3"
      >
        <Bell className="h-3 w-3 mr-1" />
        {loading ? "..." : "Aktivieren"}
      </Button>
    </div>
  );
}
