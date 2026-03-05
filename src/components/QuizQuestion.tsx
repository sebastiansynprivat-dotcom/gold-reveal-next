import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { QuizQuestion as QuizQuestionType } from "@/data/quizQuestions";

interface QuizQuestionProps {
  question: QuizQuestionType;
  currentIndex: number;
  totalQuestions: number;
  onAnswer: (selectedIndex: number) => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

const QuizQuestion = ({ question, currentIndex, totalQuestions, onAnswer }: QuizQuestionProps) => {
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease }}
      className="flex flex-col items-center justify-center min-h-screen px-6 py-16"
    >
      <div className="w-full max-w-md mb-12">
        <div className="flex justify-between items-baseline text-xs tracking-wide mb-3">
          <span className="text-muted-foreground font-medium">
            {currentIndex + 1} / {totalQuestions}
          </span>
          <span className="text-primary/70 font-medium uppercase tracking-widest text-[10px]">
            {question.category}
          </span>
        </div>
        <div className="w-full h-1 bg-muted/30 rounded-full overflow-hidden relative">
          <motion.div
            className="h-full bg-primary rounded-full relative"
            initial={{ width: `${(currentIndex / totalQuestions) * 100}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease }}
          >
            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary gold-glow" />
          </motion.div>
        </div>
      </div>

      <h2
        className="text-2xl md:text-3xl text-center mb-12 max-w-md leading-snug tracking-tight"
      >
        {question.question}
      </h2>

      {question.type === "multiple-choice" && (
        <MultipleChoiceOptions options={question.options} onSelect={(index) => onAnswer(index)} />
      )}
      {question.type === "sort" && (
        <SortOptions items={question.items} correctOrder={question.correctOrder} onComplete={(isCorrect) => onAnswer(isCorrect ? 0 : -1)} />
      )}
      {question.type === "match" && (
        <MatchOptions labels={question.labels} descriptions={question.descriptions} onComplete={(isCorrect) => onAnswer(isCorrect ? 0 : -1)} />
      )}
    </motion.div>
  );
};

const MultipleChoiceOptions = ({ options, onSelect }: { options: string[]; onSelect: (index: number) => void }) => (
  <div className="w-full max-w-md space-y-2.5">
    {options.map((option, index) => (
      <motion.button
        key={index}
        onClick={() => onSelect(index)}
        className="w-full text-left px-5 py-4 rounded-xl glass-card-subtle hover:border-primary/40 hover:bg-card/80 transition-all duration-300 text-foreground group"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.4, ease }}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.985 }}
      >
        <span className="text-primary/60 font-mono text-xs mr-3 group-hover:text-primary transition-colors">
          {String.fromCharCode(65 + index)}
        </span>
        <span className="text-sm leading-relaxed">{option}</span>
      </motion.button>
    ))}
  </div>
);

const SortOptions = ({ items, correctOrder, onComplete }: { items: string[]; correctOrder: string[]; onComplete: (isCorrect: boolean) => void }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const remaining = items.filter((item) => !selected.includes(item));

  const handleTap = (item: string) => {
    const next = [...selected, item];
    setSelected(next);
    if (next.length === correctOrder.length) {
      const isCorrect = next.every((v, i) => v === correctOrder[i]);
      setTimeout(() => onComplete(isCorrect), 400);
    }
  };

  const handleUndo = () => setSelected((prev) => prev.slice(0, -1));

  return (
    <div className="w-full max-w-md">
      <div className="flex flex-wrap gap-2 mb-6 min-h-[56px] p-4 rounded-xl glass-card">
        {selected.length === 0 && <span className="text-muted-foreground/50 text-sm">Tippe die Preise in der richtigen Reihenfolge an…</span>}
        {selected.map((item, i) => (
          <motion.span key={`sel-${i}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/15 text-primary font-semibold border border-primary/20 text-sm">
            {item}{item !== "Kostenlos" && "€"}
            {i < selected.length - 1 && <span className="ml-1 text-primary/30">→</span>}
          </motion.span>
        ))}
      </div>

      {selected.length > 0 && selected.length < correctOrder.length && (
        <motion.button onClick={handleUndo} className="text-xs text-muted-foreground/60 hover:text-foreground mb-5 transition-colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>← Rückgängig</motion.button>
      )}

      <div className="text-[11px] text-muted-foreground/50 mb-3 uppercase tracking-widest">Noch {correctOrder.length - selected.length} auswählen</div>
      <div className="flex flex-wrap gap-2">
        {remaining.map((item) => (
          <motion.button key={item} onClick={() => handleTap(item)} className="px-4 py-2.5 rounded-xl glass-card-subtle hover:border-primary/40 transition-all duration-300 text-foreground font-medium text-sm" whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }} disabled={selected.length >= correctOrder.length}>
            {item}{item !== "Kostenlos" && "€"}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

const MatchOptions = ({ labels, descriptions, onComplete }: { labels: string[]; descriptions: string[]; onComplete: (isCorrect: boolean) => void }) => {
  const shuffledDescriptions = useMemo(() => {
    const shuffled = [...descriptions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [descriptions]);

  const [assignments, setAssignments] = useState<(string | null)[]>(() => labels.map(() => null));
  const [activeLabel, setActiveLabel] = useState<number | null>(null);

  const assignedDescriptions = assignments.filter(Boolean) as string[];
  const availableDescriptions = shuffledDescriptions.filter((d) => !assignedDescriptions.includes(d));

  const handleLabelTap = (index: number) => {
    if (assignments[index]) {
      setAssignments((prev) => { const next = [...prev]; next[index] = null; return next; });
      setActiveLabel(null);
    } else {
      setActiveLabel(index);
    }
  };

  const handleDescriptionTap = (desc: string) => {
    if (activeLabel === null) return;
    const next = [...assignments];
    next[activeLabel] = desc;
    setAssignments(next);
    setActiveLabel(null);
    if (next.every((a) => a !== null)) {
      const isCorrect = next.every((a, i) => a === descriptions[i]);
      setTimeout(() => onComplete(isCorrect), 500);
    }
  };

  return (
    <div className="w-full max-w-xl">
      <p className="text-xs text-muted-foreground/50 mb-6 text-center uppercase tracking-widest">Preis antippen → Beschreibung zuordnen</p>
      <div className="space-y-2 mb-8">
        {labels.map((label, i) => (
          <motion.button key={label} onClick={() => handleLabelTap(i)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 text-left ${activeLabel === i ? "glass-card border-primary/50 ring-1 ring-primary/20" : assignments[i] ? "glass-card-subtle border-primary/20" : "glass-card-subtle hover:border-primary/30"}`} whileTap={{ scale: 0.99 }}>
            <span className="text-primary font-bold min-w-[60px] shrink-0 text-sm">{label}</span>
            <span className="text-muted-foreground/30 text-xs">→</span>
            {assignments[i] ? <span className="text-foreground/80 text-sm">{assignments[i]}</span> : <span className="text-muted-foreground/30 text-xs italic">{activeLabel === i ? "Wähle eine Beschreibung…" : "Antippen"}</span>}
          </motion.button>
        ))}
      </div>

      {activeLabel !== null && availableDescriptions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }} className="space-y-2">
          <div className="text-[11px] text-primary/50 font-medium mb-3 uppercase tracking-widest">Beschreibung für {labels[activeLabel]}</div>
          {availableDescriptions.map((desc) => (
            <motion.button key={desc} onClick={() => handleDescriptionTap(desc)} className="w-full text-left px-4 py-3 rounded-xl glass-card-subtle hover:border-primary/40 transition-all duration-300 text-foreground/80 text-sm" whileHover={{ x: 4 }} whileTap={{ scale: 0.985 }}>
              {desc}
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default QuizQuestion;
