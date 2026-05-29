import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Apple, MonitorSmartphone, Play, Sparkles, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

const isStandaloneNow = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true;

export default function HomescreenTutorial({ isFirstLogin, manualOpen, onManualClose, onDismiss }: HomescreenTutorialProps) {
  const [open, setOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [forced, setForced] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    if (!isFirstLogin) return;
    if (isStandaloneNow()) return;
    const seen = localStorage.getItem(TUTORIAL_KEY);
    if (!seen) {
      const timer = setTimeout(() => {
        setForced(true);
        setOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isFirstLogin]);

  useEffect(() => {
    if (manualOpen) {
      setForced(false);
      setOpen(true);
    }
  }, [manualOpen]);

  useEffect(() => {
    if (!open || !forced) return;
    const check = () => {
      if (isStandaloneNow()) {
        localStorage.setItem(TUTORIAL_KEY, "true");
        setForced(false);
        setOpen(false);
        onDismiss?.();
      }
    };
    const interval = setInterval(check, 1000);
    const mql = window.matchMedia("(display-mode: standalone)");
    const onChange = () => check();
    mql.addEventListener?.("change", onChange);
    window.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(interval);
      mql.removeEventListener?.("change", onChange);
      window.removeEventListener("visibilitychange", check);
    };
  }, [open, forced, onDismiss]);

  const handleClose = () => {
    if (forced) return;
    localStorage.setItem(TUTORIAL_KEY, "true");
    setOpen(false);
    onManualClose?.();
    onDismiss?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
        <DialogContent
          className={`relative overflow-hidden border-0 bg-[#0a0a0f]/95 backdrop-blur-2xl max-w-lg mx-auto max-h-[92vh] overflow-y-auto p-0 shadow-2xl ${forced ? "[&>button]:hidden" : ""}`}
          style={{
            boxShadow: "0 0 60px -10px rgba(201,168,76,0.25), 0 25px 50px -12px rgba(0,0,0,0.8)",
          }}
          onInteractOutside={(e) => { if (forced) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (forced) e.preventDefault(); }}
          onPointerDownOutside={(e) => { if (forced) e.preventDefault(); }}
        >
          {/* Gold gradient top bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent opacity-80" />
          
          {/* Animated background shimmer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div 
              className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-[spin_12s_linear_infinite] opacity-[0.03]"
              style={{
                background: "conic-gradient(from 0deg, transparent 0deg, #c9a84c 60deg, transparent 120deg, transparent 180deg, #c9a84c 240deg, transparent 300deg, transparent 360deg)",
              }}
            />
          </div>

          <div className="p-6 space-y-5 relative z-10">
            {/* Premium Header */}
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#c9a84c]/20 to-[#c9a84c]/5 border border-[#c9a84c]/30 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-[#c9a84c]" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#c9a84c] flex items-center justify-center">
                    <span className="text-[8px] font-bold text-black">!</span>
                  </div>
                </div>
                <div>
                  <DialogTitle className="text-foreground text-xl font-bold tracking-tight">
                    App zum Homescreen
                  </DialogTitle>
                  <p className="text-[#c9a84c] text-sm font-medium">Nur noch ein Schritt bis zum vollen Erlebnis</p>
                </div>
              </div>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed pl-[60px]">
                Damit du keine Benachrichtigungen verpasst und die App wie eine native App nutzen kannst, füge sie jetzt zu deinem Homescreen hinzu.
              </DialogDescription>
            </DialogHeader>

            {/* Premium Warning Banner */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative overflow-hidden rounded-2xl border border-[#c9a84c]/30 bg-gradient-to-r from-[#c9a84c]/10 via-[#c9a84c]/5 to-transparent p-4"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#c9a84c]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#c9a84c]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4 text-[#c9a84c]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#c9a84c]">Wichtig für deinen Erfolg</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {forced
                      ? "Dieses Fenster bleibt geöffnet, bis du die App zu deinem Homescreen hinzugefügt hast. Push-Benachrichtigungen sind essenziell für deine täglichen Aufgaben. Dauert nur 30 Sekunden!"
                      : "Push-Benachrichtigungen sind essenziell für deine täglichen Aufgaben. Bitte füge die App jetzt hinzu — das dauert nur 30 Sekunden!"}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Device Tutorials */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest ml-1">Wähle dein Gerät</p>
              <div className="space-y-2.5">
                <AnimatePresence>
                  {tutorials.map((t, idx) => {
                    const Icon = t.icon;
                    const isHovered = hoveredCard === idx;
                    return (
                      <motion.div
                        key={t.label}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        onMouseEnter={() => setHoveredCard(idx)}
                        onMouseLeave={() => setHoveredCard(null)}
                        className={`relative overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer group ${
                          isHovered 
                            ? "border-[#c9a84c]/40 bg-[#c9a84c]/10 shadow-[0_0_20px_-5px_rgba(201,168,76,0.3)]" 
                            : "border-border/50 bg-secondary/30"
                        }`}
                      >
                        {/* Hover gradient sweep */}
                        <div className={`absolute inset-0 bg-gradient-to-r from-[#c9a84c]/5 to-transparent transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`} />
                        
                        <div className="relative p-4 flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                            isHovered 
                              ? "bg-[#c9a84c]/20 shadow-[0_0_15px_-3px_rgba(201,168,76,0.4)]" 
                              : "bg-secondary"
                          }`}>
                            <Icon className={`h-5 w-5 transition-colors duration-300 ${isHovered ? "text-[#c9a84c]" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold transition-colors duration-300 ${isHovered ? "text-[#c9a84c]" : "text-foreground"}`}>
                              {t.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.description}</p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveVideo(t.embedId);
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#c9a84c] hover:text-[#f0d78c] mt-2 transition-colors group/btn"
                            >
                              <div className="w-5 h-5 rounded-full bg-[#c9a84c]/20 flex items-center justify-center">
                                <Play className="h-2.5 w-2.5 fill-current" />
                              </div>
                              <span>Video-Anleitung</span>
                              <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            {forced ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center space-y-3 pt-2"
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#c9a84c] animate-pulse" />
                  <p className="text-xs text-[#c9a84c] font-medium">Warte auf Installation...</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Sobald du die App zum Homescreen hinzugefügt und sie von dort geöffnet hast, schließt sich dieses Fenster automatisch.
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button 
                  onClick={handleClose} 
                  className="w-full bg-gradient-to-r from-[#c9a84c] to-[#a0853a] hover:from-[#d4b76a] hover:to-[#b89a4e] text-black font-bold py-6 rounded-xl transition-all duration-300 shadow-[0_0_20px_-5px_rgba(201,168,76,0.4)] hover:shadow-[0_0_30px_-5px_rgba(201,168,76,0.6)]"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Verstanden — App hinzufügen!
                </Button>
              </motion.div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Player Dialog */}
      <Dialog open={!!activeVideo} onOpenChange={(v) => { if (!v) setActiveVideo(null); }}>
        <DialogContent 
          className="border-0 bg-[#0a0a0f]/95 backdrop-blur-2xl sm:max-w-lg mx-auto p-0 overflow-hidden shadow-2xl"
          style={{
            boxShadow: "0 0 60px -10px rgba(201,168,76,0.25), 0 25px 50px -12px rgba(0,0,0,0.8)",
          }}
        >
          <div className="p-5 space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9a84c]/20 to-[#c9a84c]/5 border border-[#c9a84c]/30 flex items-center justify-center">
                  <Play className="h-5 w-5 text-[#c9a84c] fill-current" />
                </div>
                <DialogTitle className="text-foreground text-lg font-bold">Video-Anleitung</DialogTitle>
              </div>
              <DialogDescription className="sr-only">YouTube Video-Anleitung zum Homescreen hinzufügen</DialogDescription>
            </DialogHeader>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-secondary border border-border/50 shadow-inner">
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
            <Button 
              variant="outline" 
              onClick={() => setActiveVideo(null)} 
              className="w-full border-[#c9a84c]/30 text-[#c9a84c] hover:bg-[#c9a84c]/10 hover:text-[#f0d78c] rounded-xl py-5"
            >
              Schließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
