import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MessageSquareText, Sparkles, Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function MassDmGenerator() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setMessage("");
    setCopied(false);
    try {
      const { data, error } = await supabase.functions.invoke("generate-massdm");
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setMessage(data.message);
    } catch (e) {
      console.error(e);
      toast.error("Fehler beim Generieren der MassDM");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("MassDM kopiert! 📋");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full glass-card-subtle rounded-xl p-3 lg:p-4 border border-accent/20 hover:border-accent/40 transition-all hover:bg-accent/5 active:scale-[0.98] text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
            <MessageSquareText className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">MassDM Generator</p>
            <p className="text-xs text-muted-foreground mt-0.5">Lass dir per KI eine MassDM generieren</p>
          </div>
          <Sparkles className="h-4 w-4 text-accent/60 shrink-0" />
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-accent/20 bg-background">
          {/* Header with gradient accent */}
          <div className="relative px-6 pt-6 pb-4">
            <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
            <DialogHeader className="relative">
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <MessageSquareText className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">MassDM Generator</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Generiere einzigartige MassDM-Nachrichten per KI
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-4">
            {/* Generate Button */}
            <button
              onClick={generate}
              disabled={loading}
              className="w-full h-12 rounded-xl bg-accent text-accent-foreground font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generiere...
                </>
              ) : message ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Nochmal generieren
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  MassDM generieren
                </>
              )}
            </button>

            {/* Result */}
            <AnimatePresence mode="wait">
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  <div className="rounded-xl bg-secondary/50 border border-border/40 p-4">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {message}
                    </p>
                  </div>

                  <button
                    onClick={handleCopy}
                    className="w-full h-10 rounded-xl border border-accent/30 bg-accent/5 text-accent font-semibold text-xs transition-all hover:bg-accent/10 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" /> Kopiert!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Nachricht kopieren
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
