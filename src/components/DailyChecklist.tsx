import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClipboardCheck } from "lucide-react";

const TASKS = [
  { id: 1, label: "Hast du bis zu 6 MassDM's gemacht?", audioHint: "/audio/massdm-info.mp3", audioLabel: "Wieso ist das wichtig?" },
  { id: 2, label: "Deine alte MassDM gelöscht bevor eine neue gesendet wird?" },
  { id: 3, label: "Feedback gegeben, wie der heutige Tag lief?", popupHint: true, popupLabel: "Wie mache ich das?" },
  { id: 4, label: "Geschaut ob wir für dich gepostet haben? (Falls nicht, gib uns bitte eine Info in der Gruppe)" },
  { id: 5, label: "Auf alle Nachrichten geantwortet die in deinem Account offen sind?", audioHint: "/audio/open-chats-info.mp3", audioLabel: "Wie weiß ich das alles beantwortet ist?" },
];

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
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    localStorage.setItem(getTodayKey(), JSON.stringify([...completed]));
  }, [completed]);

  const toggle = (id: number) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAudioToggle = (id: number) => {
    setOpenAudioId((prev) => {
      if (prev === id) {
        audioRef.current?.pause();
        return null;
      }
      return id;
    });
  };

  const progress = (completed.size / TASKS.length) * 100;
  const allDone = completed.size === TASKS.length;

  return (
    <motion.section
      className="glass-card-subtle rounded-xl p-4 lg:p-6 space-y-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-accent" />
          <h2 className="text-sm lg:text-base font-semibold text-foreground">Tägliche Aufgaben</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {completed.size}/{TASKS.length} erledigt
        </span>
      </div>

      <Progress value={progress} className="h-2 [&>div]:bg-accent" />

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
                    className="text-xs text-primary/70 hover:text-primary transition-colors underline underline-offset-2"
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
                        <div className="mt-2 rounded-lg bg-primary/5 border border-primary/10 p-2.5">
                          <audio ref={audioRef} controls autoPlay className="w-full h-8" src={task.audioHint} />
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
                    className="text-xs text-primary/70 hover:text-primary transition-colors underline underline-offset-2"
                  >
                    {(task as any).popupLabel}
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

      {/* Feedback Popup (Platzhalter) */}
      <Dialog open={feedbackPopupOpen} onOpenChange={setFeedbackPopupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Feedback geben</DialogTitle>
            <DialogDescription>
              Dieser Bereich wird noch eingerichtet. Hier kannst du bald dein tägliches Feedback abgeben.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-muted-foreground text-sm">
            🚧 Platzhalter – kommt bald!
          </div>
        </DialogContent>
      </Dialog>
    </motion.section>
  );
}
