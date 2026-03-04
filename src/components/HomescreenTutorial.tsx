import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Apple, MonitorSmartphone, ExternalLink, AlertTriangle } from "lucide-react";

const TUTORIAL_KEY = "homescreen_tutorial_seen";

const tutorials = [
  {
    label: "iPhone / iPad (Safari)",
    icon: Apple,
    description: 'Öffne die App in Safari, tippe auf das Teilen-Symbol und wähle "Zum Home-Bildschirm".',
    videoUrl: "https://www.youtube.com/watch?v=QpFbExFHXe0",
    videoTitle: "Website zum iPhone Homescreen hinzufügen",
  },
  {
    label: "Android (Chrome)",
    icon: Smartphone,
    description: 'Öffne die App in Chrome, tippe auf die drei Punkte oben rechts und wähle "Zum Startbildschirm hinzufügen".',
    videoUrl: "https://www.youtube.com/watch?v=P_DyI_2wA3I",
    videoTitle: "Website zum Android Homescreen hinzufügen",
  },
  {
    label: "Samsung (Samsung Internet)",
    icon: MonitorSmartphone,
    description: 'Öffne die App im Samsung-Browser, tippe auf das Menü und wähle "Seite zum Startbildschirm hinzufügen".',
    videoUrl: "https://www.youtube.com/watch?v=LUOSb7UbUyI",
    videoTitle: "Website zum Startbildschirm hinzufügen (Chrome/Samsung)",
  },
];

interface HomescreenTutorialProps {
  isFirstLogin: boolean;
  manualOpen?: boolean;
  onManualClose?: () => void;
}

export default function HomescreenTutorial({ isFirstLogin, manualOpen, onManualClose }: HomescreenTutorialProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isFirstLogin) return;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as any).standalone === true;
    if (isStandalone) return;
    const seen = localStorage.getItem(TUTORIAL_KEY);
    if (!seen) {
      const timer = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [isFirstLogin]);

  useEffect(() => {
    if (manualOpen) setOpen(true);
  }, [manualOpen]);

  const handleClose = () => {
    localStorage.setItem(TUTORIAL_KEY, "true");
    setOpen(false);
    onManualClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogContent className="glass-card border-border max-w-md mx-auto max-h-[90vh] overflow-y-auto">
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
            <p className="text-sm font-semibold text-foreground">Sehr wichtig!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bitte füge die App jetzt zu deinem Homescreen hinzu. Nur so bekommst du Push-Benachrichtigungen und kannst die App wie gewohnt nutzen. Das dauert nur 30 Sekunden!
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
                <a
                  href={t.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-medium text-accent hover:underline mt-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(t.videoUrl, "_blank", "noopener,noreferrer");
                    e.preventDefault();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Video-Anleitung ansehen
                </a>
              </div>
            );
          })}
        </div>

        <Button onClick={handleClose} className="w-full mt-2">
          Verstanden, ich füge die App hinzu!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
