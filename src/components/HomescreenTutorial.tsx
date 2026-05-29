import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Apple, MonitorSmartphone, Play, AlertTriangle } from "lucide-react";

const TUTORIAL_KEY = "homescreen_tutorial_seen";

const tutorials = [
  {
    label: "iPhone / iPad (Safari)",
    icon: Apple,
    description: 'Öffne die App in Safari, tippe auf das Teilen-Symbol und wähle "Zum Home-Bildschirm".',
    embedId: "QpFbExFHXe0",
  },
  {
    label: "Android (Chrome)",
    icon: Smartphone,
    description: 'Öffne die App in Chrome, tippe auf die drei Punkte oben rechts und wähle "Zum Startbildschirm hinzufügen".',
    embedId: "P_DyI_2wA3I",
  },
  {
    label: "Samsung (Samsung Internet)",
    icon: MonitorSmartphone,
    description: 'Öffne die App im Samsung-Browser, tippe auf das Menü und wähle "Seite zum Startbildschirm hinzufügen".',
    embedId: "LUOSb7UbUyI",
  },
];

interface HomescreenTutorialProps {
  isFirstLogin: boolean;
  manualOpen?: boolean;
  onManualClose?: () => void;
  onDismiss?: () => void;
}

export default function HomescreenTutorial({ isFirstLogin, manualOpen, onManualClose, onDismiss }: HomescreenTutorialProps) {
  const [open, setOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  useEffect(() => {
    const forced = (() => { try { return localStorage.getItem("force_homescreen_tutorial") === "1"; } catch { return false; } })();
    if (!isFirstLogin && !forced) return;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as any).standalone === true;
    if (isStandalone) {
      try { localStorage.removeItem("force_homescreen_tutorial"); } catch {}
      return;
    }
    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, [isFirstLogin]);


  useEffect(() => {
    if (manualOpen) setOpen(true);
  }, [manualOpen]);

  // Auto-close as soon as the app is actually installed (standalone mode)
  useEffect(() => {
    if (!open) return;
    const mql = window.matchMedia("(display-mode: standalone)");
    const check = () => {
      const isStandalone = mql.matches || (window.navigator as any).standalone === true;
      if (isStandalone) {
        localStorage.setItem(TUTORIAL_KEY, "true");
        try { localStorage.removeItem("force_homescreen_tutorial"); } catch {}
        setOpen(false);
        onManualClose?.();
        onDismiss?.();
      }
    };
    mql.addEventListener?.("change", check);
    const interval = setInterval(check, 1500);
    const onVis = () => check();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      mql.removeEventListener?.("change", check);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [open, onManualClose, onDismiss]);

  return (
    <>
    <Dialog open={open}>
      <DialogContent
        className="glass-card border-border max-w-md mx-auto max-h-[90vh] overflow-y-auto [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5 text-accent" />
            App zum Homescreen hinzufügen
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Damit du keine Benachrichtigungen verpasst und die App wie eine echte App nutzen kannst.
          </DialogDescription>
        </DialogHeader>

        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/10 border border-accent/20">
          <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Pflicht-Schritt!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dieses Fenster verschwindet automatisch, sobald du die App zum Homescreen hinzugefügt und von dort geöffnet hast. Das dauert nur 30 Sekunden!
            </p>
          </div>
        </div>

        {/* Device Tutorials */}
        <div className="space-y-3 mt-2">
          {tutorials.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="glass-card-subtle rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-accent" />
                  <span className="text-sm font-bold text-foreground">{t.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t.description}</p>
                <button
                  type="button"
                  onClick={() => setActiveVideo(t.embedId)}
                  className="inline-flex items-center gap-2 text-xs font-medium text-accent hover:underline mt-1"
                >
                  <Play className="h-3.5 w-3.5" />
                  Video-Anleitung ansehen
                </button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>


    {/* Video Player Dialog */}
    <Dialog open={!!activeVideo} onOpenChange={(v) => { if (!v) setActiveVideo(null); }}>
      <DialogContent className="glass-card border-border sm:max-w-lg mx-auto p-4">
        <DialogHeader>
          <DialogTitle className="text-foreground text-base">Video-Anleitung</DialogTitle>
          <DialogDescription className="sr-only">YouTube Video-Anleitung zum Homescreen hinzufügen</DialogDescription>
        </DialogHeader>
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-secondary">
          {activeVideo && (
            <iframe
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
              frameBorder="0"
              allowFullScreen
              allow="autoplay; encrypted-media"
              className="w-full h-full"
              title="Video-Anleitung"
            />
          )}
        </div>
        <Button variant="outline" onClick={() => setActiveVideo(null)} className="w-full mt-1">
          Schließen
        </Button>
      </DialogContent>
    </Dialog>
    </>
  );
}
