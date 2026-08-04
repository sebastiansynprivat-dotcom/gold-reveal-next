import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BellOff, Settings, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  getPushStatus,
  startPushHealthMonitor,
  subscribeToPush,
  type PushStatus,
} from "@/lib/pushNotifications";
import { useUILanguage } from "@/hooks/useUILanguage";

const SNOOZE_KEY = "push_recovery_snoozed_at";
const SNOOZE_MS = 24 * 60 * 60 * 1000;

function isSnoozed() {
  try {
    const at = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
}

/**
 * Global push health layer:
 * - keeps the push subscription alive automatically (foreground, focus, online,
 *   auth change, hourly, and on browser endpoint rotation)
 * - shows a recovery popup when the permission was revoked / notifications died
 */
export default function PushHealthGuard() {
  const { t } = useUILanguage();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const evaluate = async (next?: PushStatus) => {
      const s = next ?? (await getPushStatus());
      setStatus(s);
      const broken = s === "denied" || s === "error";
      setOpen(broken && !isSnoozed());
    };

    const stop = startPushHealthMonitor((s) => void evaluate(s));
    void evaluate();

    const onVisible = () => {
      if (document.visibilityState === "visible") void evaluate();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const handleRetry = async () => {
    setLoading(true);
    const ok = await subscribeToPush();
    setLoading(false);
    if (ok) {
      toast.success(t("pushDialog.toastOk"));
      setOpen(false);
      setStatus("subscribed");
    } else {
      toast.error(t("pushBanner.toastDenied"));
    }
  };

  const handleLater = () => {
    snooze();
    setOpen(false);
  };

  if (!open) return null;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const instruction = isIOS
    ? t("pushBanner.iosInstruction")
    : isAndroid
      ? t("pushBanner.androidInstruction")
      : t("pushBanner.desktopInstruction");

  const denied = status === "denied";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleLater()}>
      <DialogContent className="max-w-[340px] p-0 overflow-hidden gap-0 border-0 bg-transparent shadow-none">
        <div
          className="absolute -inset-4 rounded-3xl opacity-40 blur-2xl pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, hsl(43 76% 50% / 0.45), transparent 70%)",
          }}
        />
        <div className="relative glass-card rounded-2xl border border-accent/25 p-6 space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-accent/10 border border-accent/25 flex items-center justify-center">
            <BellOff className="h-6 w-6 text-accent animate-pulse" />
          </div>

          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base font-bold text-gold-gradient text-center">
              {t("pushRecovery.title")}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground text-center leading-relaxed">
              {t("pushRecovery.desc")}
            </DialogDescription>
          </DialogHeader>

          {denied && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/60 border border-border/40">
              <Settings className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">{instruction}</p>
            </div>
          )}

          <button
            onClick={handleRetry}
            disabled={loading}
            className="w-full h-11 rounded-xl font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
            style={{
              background:
                "linear-gradient(135deg, hsl(43 56% 42%), hsl(43 76% 50%), hsl(43 56% 42%))",
              color: "hsl(0 0% 4%)",
            }}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? t("pushRecovery.ctaLoading") : t("pushRecovery.cta")}
          </button>

          <button
            onClick={handleLater}
            className="w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("pushRecovery.later")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
