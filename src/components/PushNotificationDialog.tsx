import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Bell, Sparkles, TrendingUp, Users } from "lucide-react";
import { subscribeToPush, isPushSubscribed } from "@/lib/pushNotifications";
import { toast } from "sonner";

const PUSH_DIALOG_KEY = "push_notification_dialog_seen";

const perks = [
  { icon: TrendingUp, text: "Account-Upgrades sofort erfahren" },
  { icon: Sparkles, text: "Exklusive Tipps & neue Features" },
  { icon: Users, text: "Team-Updates in Echtzeit" },
];

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
    } else {
      toast.error("Benachrichtigungen konnten nicht aktiviert werden.");
    }
    // Close popup regardless of result (accepted or denied)
    handleClose();
  };

  const handleClose = () => {
    localStorage.setItem(PUSH_DIALOG_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}} modal>
      <DialogContent
        className="max-w-[340px] mx-auto p-0 overflow-hidden gap-0 border-0 bg-transparent shadow-none [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Glow backdrop */}
        <div className="absolute -inset-4 rounded-3xl opacity-40 blur-2xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, hsl(43 76% 50% / 0.5), hsl(43 56% 40% / 0.2), transparent 70%)" }}
        />
        
        <div className="relative rounded-2xl overflow-hidden">
          {/* Gold gradient top edge */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent z-10" />
          
          {/* Glass background */}
          <div className="glass-card rounded-2xl border border-accent/20" style={{ boxShadow: "0 0 40px hsl(43 56% 52% / 0.15), 0 0 80px hsl(43 56% 52% / 0.08)" }}>
            {/* Top section with icon */}
            <div className="pt-8 pb-4 px-6 text-center">
              {/* Animated bell icon */}
              <div className="relative mx-auto w-16 h-16 mb-5">
                <div className="absolute inset-0 rounded-full bg-accent/5 animate-pulse" />
                <div className="absolute inset-1 rounded-full bg-gradient-to-b from-accent/20 to-accent/5 border border-accent/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Bell className="h-7 w-7 text-accent" />
                </div>
              </div>

              <DialogHeader className="space-y-2">
                <DialogTitle className="text-lg font-bold text-gold-gradient text-center">
                  Bleib immer up to date
                </DialogTitle>
                <DialogDescription className="text-[13px] text-muted-foreground text-center leading-relaxed max-w-[260px] mx-auto">
                  Aktiviere Benachrichtigungen und verpasse keine Chance mehr.
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Perks */}
            <div className="px-5 pb-4 space-y-2">
              {perks.map((perk) => {
                const Icon = perk.icon;
                return (
                  <div
                    key={perk.text}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-secondary/60 border border-border/40"
                  >
                    <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <span className="text-xs font-medium text-foreground">{perk.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Divider with glow */}
            <div className="mx-5 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

            {/* CTA */}
            <div className="p-5">
              <button
                onClick={handleActivate}
                disabled={loading}
                className="w-full h-12 rounded-xl font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2.5 relative overflow-hidden group"
                style={{
                  background: "linear-gradient(135deg, hsl(43 56% 42%), hsl(43 76% 50%), hsl(43 56% 42%))",
                  color: "hsl(0 0% 4%)",
                  boxShadow: "0 0 30px hsl(43 56% 52% / 0.25), 0 4px 12px hsl(0 0% 0% / 0.3)",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Bell className="h-4 w-4 relative z-10" />
                <span className="relative z-10">{loading ? "Wird aktiviert..." : "Benachrichtigungen aktivieren 🔔"}</span>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
