import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";

export default function ExitIntentPopup() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (e.clientY <= 5 && !dismissed) {
      setShow(true);
    }
  }, [dismissed]);

  useEffect(() => {
    // Only on desktop
    if (window.matchMedia("(pointer: fine)").matches) {
      // Delay activation by 10s so it doesn't trigger immediately
      const timeout = setTimeout(() => {
        document.addEventListener("mouseleave", handleMouseLeave);
      }, 10000);
      return () => {
        clearTimeout(timeout);
        document.removeEventListener("mouseleave", handleMouseLeave);
      };
    }
  }, [handleMouseLeave]);

  const dismiss = () => {
    setShow(false);
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={dismiss} />

          {/* Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative glass-card rounded-2xl p-6 sm:p-8 max-w-md w-full text-center border border-primary/20 shadow-2xl"
          >
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-primary" />
            </div>

            <h3 className="text-xl font-bold text-foreground mb-2">
              Warte kurz! 🤚
            </h3>
            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
              Du bist nur noch <span className="text-primary font-semibold">einen Schritt</span> davon entfernt, zu erfahren wie du mit Chatten Geld verdienen kannst. Die Plätze sind begrenzt – sichere dir deinen, bevor er weg ist!
            </p>

            <button
              onClick={dismiss}
              className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-base gold-glow hover:gold-glow-strong hover:scale-[1.02] transition-all duration-300"
            >
              Video weiter ansehen →
            </button>

            <p className="text-muted-foreground/60 text-xs mt-3">
              100% kostenlos · Keine Anmeldung nötig
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
