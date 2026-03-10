import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClipboardCheck, Copy, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import GoldenAudioPlayer from "@/components/GoldenAudioPlayer";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const TASKS = [
  { id: 1, label: "Hast du bis zu 6 MassDM's gemacht?", audioHint: "/audio/massdm-info.mp3", audioLabel: "Wieso ist das wichtig?", massDmPopup: true, massDmPopupLabel: "Muss ich 6 MassDMs machen?" },
  { id: 2, label: "Deine alte MassDM gelöscht bevor eine neue gesendet wird?" },
  { id: 3, label: "Feedback gegeben, wie der heutige Tag lief?", popupHint: true, popupLabel: "Wie mache ich das?" },
  { id: 4, label: "Geschaut ob wir für dich gepostet haben? (Falls nicht, gib uns bitte eine Info in der Gruppe)" },
  { id: 5, label: "Auf alle Nachrichten geantwortet die in deinem Account offen sind?", audioHint: "/audio/open-chats-info.mp3", audioLabel: "Wie weiß ich das alles beantwortet ist?" },
  { id: 6, label: "Mindestens 10 Posts von anderen Models kommentiert?" },
];

const FEEDBACK_TEMPLATE = `Feedback zum heutigen Tag:

Umsatz:

MassDMs gesendet:

Was lief gut?:

Was lief schlecht?:

Offene Fragen (optional):`;

function FeedbackTemplate() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(FEEDBACK_TEMPLATE);
      setCopied(true);
      toast.success("Vorlage kopiert! 📋");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-secondary/50 border border-border/40 p-3">
        <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">{FEEDBACK_TEMPLATE}</pre>
      </div>
      <button
        onClick={handleCopy}
        className="w-full h-10 rounded-lg bg-accent text-accent-foreground font-semibold text-xs transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
      >
        {copied ? <><Check className="h-4 w-4" /> Kopiert!</> : <><Copy className="h-4 w-4" /> Vorlage kopieren</>}
      </button>
    </div>
  );
}

function getTodayKey() {
  return `daily_checklist_${new Date().toISOString().slice(0, 10)}`;
}

export default function DailyChecklist() {
  const [completed, setCompleted] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(getTodayKey());
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [openAudioId, setOpenAudioId] = useState<number | null>(null);
  const [feedbackPopupOpen, setFeedbackPopupOpen] = useState(false);
  const [massDmPopupOpen, setMassDmPopupOpen] = useState(false);
  const { playCheckSound } = useSoundEffects();

  useEffect(() => {
    localStorage.setItem(getTodayKey(), JSON.stringify([...completed]));
  }, [completed]);

  const toggle = (id: number) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        playCheckSound();
      }
      return next;
    });
  };

  const handleAudioToggle = (id: number) => {
    setOpenAudioId((prev) => prev === id ? null : id);
  };

  const progress = (completed.size / TASKS.length) * 100;
  const allDone = completed.size === TASKS.length;

  const [isOpen, setIsOpen] = useState(true);

  return (
    <motion.section
      className={`glass-card-subtle rounded-xl p-4 lg:p-6 transition-all duration-500 card-inner-glow ${allDone ? "gold-gradient-border-animated pulse-glow" : ""}`}
      initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-accent" />
              <h2 className="text-sm lg:text-base font-semibold text-foreground">Tägliche Aufgaben</h2>
            </div>
            <div className="flex items-center gap-2">
              {!isOpen && (
                <Progress value={progress} className="h-1.5 w-16 [&>div]:bg-accent shimmer-bar" />
              )}
              <span className="text-xs text-muted-foreground">
                {completed.size}/{TASKS.length} erledigt
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-4 space-y-4">
            <Progress value={progress} className="h-2 [&>div]:bg-accent shimmer-bar" />

            <div className="space-y-1">
              {TASKS.map((task) => {
                const done = completed.has(task.id);
                return (
                  <div key={task.id}>
                    <label
                      className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all hover:bg-accent/5 ${done ? "opacity-50" : ""}`}
                    >
                      <Checkbox
                        checked={done}
                        onCheckedChange={() => toggle(task.id)}
                        className="mt-0.5 border-accent/40 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                      />
                      <span className={`text-sm leading-snug transition-all ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {task.label}
                      </span>
                    </label>
                    {task.audioHint && (
                      <div className="ml-10 mt-0.5 mb-1">
                        <button
                          onClick={() => handleAudioToggle(task.id)}
                          className="text-xs text-accent/70 hover:text-accent transition-colors underline underline-offset-2"
                        >
                          {task.audioLabel}
                        </button>
                        <AnimatePresence>
                          {openAudioId === task.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2">
                                <GoldenAudioPlayer src={task.audioHint} autoPlay />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    {(task as any).popupHint && (
                      <div className="ml-10 mt-0.5 mb-1">
                        <button
                          onClick={() => setFeedbackPopupOpen(true)}
                          className="text-xs text-accent/70 hover:text-accent transition-colors underline underline-offset-2"
                        >
                          {(task as any).popupLabel}
                        </button>
                      </div>
                    )}
                    {(task as any).massDmPopup && (
                      <div className="ml-10 mt-0.5 mb-1">
                        <button
                          onClick={() => setMassDmPopupOpen(true)}
                          className="text-xs text-accent/70 hover:text-accent transition-colors underline underline-offset-2"
                        >
                          {(task as any).massDmPopupLabel}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {allDone && (
              <motion.p
                className="text-center text-accent font-semibold text-sm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                🎉 Alle Aufgaben erledigt – weiter so!
              </motion.p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Feedback Popup */}
      <Dialog open={feedbackPopupOpen} onOpenChange={setFeedbackPopupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tägliches Feedback</DialogTitle>
            <DialogDescription>
              Bitte diese Vorlage einmal pro Tag aus und schick sie in deine WhatsApp-Gruppe.
            </DialogDescription>
          </DialogHeader>
          <FeedbackTemplate />
        </DialogContent>
      </Dialog>

      {/* MassDM Popup */}
      <Dialog open={massDmPopupOpen} onOpenChange={setMassDmPopupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Muss ich 6 MassDMs machen?</DialogTitle>
            <DialogDescription>
              Du solltest mindestens eine MassDM am Tag machen. Wenn du aber keine Käufer findest, mach bitte mehr. Das ist wichtig, weil es deine Chance erhöht, Käufer zu finden.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </motion.section>
  );
}
