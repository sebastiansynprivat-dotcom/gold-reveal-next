import { useState, useEffect } from "react";
import { BellOff, Settings } from "lucide-react";
import { isPushSubscribed, subscribeToPush } from "@/lib/pushNotifications";
import { toast } from "sonner";
import { useUILanguage } from "@/hooks/useUILanguage";

export default function NotificationBanner() {
  const { t } = useUILanguage();
  const [show, setShow] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (!isStandalone) return;

    isPushSubscribed().then((subscribed) => {
      if (subscribed) return;

      if (!("Notification" in window)) {
        setShow(true);
        setIsDenied(true);
        return;
      }

      const perm = Notification.permission;
      if (perm === "denied") {
        setShow(true);
        setIsDenied(true);
      } else if (perm === "default") {
        setShow(true);
        setIsDenied(false);
      }
    });
  }, []);

  if (!show) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const handleRetry = async () => {
    setLoading(true);
    const ok = await subscribeToPush();
    setLoading(false);
    if (ok) {
      toast.success(t("pushDialog.toastOk"));
      setShow(false);
    } else {
      setIsDenied(true);
      toast.error(t("pushBanner.toastDenied"));
    }
  };

  const instruction = isIOS
    ? t("pushBanner.iosInstruction")
    : isAndroid
    ? t("pushBanner.androidInstruction")
    : t("pushBanner.desktopInstruction");

  return (
    <div className="glass-card-subtle rounded-xl p-3 lg:p-4 border border-accent/20 bg-accent/5 hover:border-accent/40 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
          <BellOff className="h-4 w-4 text-accent animate-pulse" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-xs font-semibold text-foreground">
            {t("pushBanner.title")}
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t("pushBanner.body")}
          </p>

          {isDenied ? (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-secondary/50 border border-border/30">
              <Settings className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">{instruction}</p>
            </div>
          ) : (
            <button
              onClick={handleRetry}
              disabled={loading}
              className="w-full h-9 rounded-lg bg-accent text-accent-foreground font-semibold text-xs transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? t("pushBanner.ctaLoading") : t("pushBanner.cta")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
