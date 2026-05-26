import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Check, Circle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useLibraryReads } from "@/hooks/useLibraryReads";

const PDF_URL = "/content/coaching-basics.pdf";
const CONTENT_KEY = "coaching-basics";
const PAGES = Array.from({ length: 6 }, (_, i) => `/content/coaching-basics/page-${String(i + 1).padStart(2, "0")}.jpg`);

export default function CoachingBasics() {
  const { reads, markProgress, markCompleted, unmarkCompleted } = useLibraryReads();
  const read = reads[CONTENT_KEY];
  const completed = !!read?.completed_at;

  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const seen = useRef<Set<number>>(new Set());
  const [maxSeen, setMaxSeen] = useState(0);
  const autoCompletedRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            seen.current.add(idx);
            setMaxSeen((m) => Math.max(m, seen.current.size));
          }
        });
      },
      { threshold: 0.5 }
    );
    refs.current.forEach((r) => r && observer.observe(r));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (maxSeen === 0) return;
    const pct = Math.round((maxSeen / PAGES.length) * 100);
    markProgress(CONTENT_KEY, pct);
    if (pct >= 90 && !completed && !autoCompletedRef.current) {
      autoCompletedRef.current = true;
      markCompleted(CONTENT_KEY);
      toast.success("Als gelesen markiert ✓", {
        description: "Stark, dass du dir die Basics drauf geschafft hast.",
      });
    }
  }, [maxSeen, completed, markProgress, markCompleted]);

  const handleToggle = () => {
    if (completed) {
      unmarkCompleted(CONTENT_KEY);
      toast.info("Markierung entfernt");
    } else {
      markCompleted(CONTENT_KEY);
      toast.success("Als gelesen markiert ✓");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur-lg bg-background/80 border-b border-border/60">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Link>
          <h1 className="text-sm sm:text-base font-bold tracking-wide uppercase text-gold-gradient truncate">
            Coaching Basics
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggle}
              className={`inline-flex items-center gap-1.5 rounded-lg text-xs sm:text-sm font-bold px-3 py-2 transition border ${
                completed
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400"
                  : "bg-secondary/50 border-border hover:border-accent/60 text-foreground"
              }`}
            >
              {completed ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              <span className="hidden sm:inline">{completed ? "Gelesen" : "Als gelesen markieren"}</span>
            </button>
            <a
              href={PDF_URL}
              download="SheX_Coaching_Basics.pdf"
              className="inline-flex items-center gap-2 rounded-lg bg-accent text-black text-xs sm:text-sm font-bold px-3 py-2 hover:brightness-110 transition"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
          </div>
        </div>
        <div className="h-1 bg-secondary/40">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${completed ? 100 : Math.round((maxSeen / PAGES.length) * 100)}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6 space-y-4">
        {PAGES.map((src, i) => (
          <motion.div
            key={src}
            ref={(el) => (refs.current[i] = el)}
            data-idx={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="rounded-xl overflow-hidden border border-border/60 shadow-[0_0_30px_rgba(212,175,55,0.12)] bg-secondary/20"
          >
            <img
              src={src}
              alt={`Seite ${i + 1}`}
              loading={i < 2 ? "eager" : "lazy"}
              className="w-full h-auto block"
            />
          </motion.div>
        ))}

        <AnimatePresence>
          {completed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 py-4 font-bold"
            >
              <Check className="h-5 w-5" />
              Erledigt – du hast die Coaching Basics gelesen.
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center py-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleToggle}
            className={`inline-flex items-center gap-2 rounded-xl font-bold px-6 py-3 text-sm transition border ${
              completed
                ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400"
                : "bg-secondary/60 border-border hover:border-accent/60 text-foreground"
            }`}
          >
            {completed ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            {completed ? "Als ungelesen markieren" : "Als gelesen markieren"}
          </button>
          <a
            href={PDF_URL}
            download="SheX_Coaching_Basics.pdf"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-bold px-6 py-3 text-sm shadow-[0_4px_20px_rgba(212,175,55,0.35)] hover:brightness-110 transition"
          >
            <Download className="h-4 w-4" />
            Als PDF herunterladen
          </a>
        </div>
      </main>
    </div>
  );
}
