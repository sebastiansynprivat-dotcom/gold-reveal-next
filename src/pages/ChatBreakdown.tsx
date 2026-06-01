import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Check, Circle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useLibraryReads } from "@/hooks/useLibraryReads";
import { useUILanguage } from "@/hooks/useUILanguage";
import ChatBreakdownReact from "@/components/ChatBreakdownReact";

const PDF_URL = "/content/chat-breakdown-01.pdf";
const CONTENT_KEY = "chat-breakdown-01";
const PAGES = Array.from({ length: 10 }, (_, i) => `/content/breakdown-01/page-${String(i + 1).padStart(2, "0")}.jpg`);

export default function ChatBreakdown() {
  const { reads, markProgress, markCompleted, unmarkCompleted } = useLibraryReads();
  const { lang } = useUILanguage();
  const useReactVersion = lang === "en";
  const read = reads[CONTENT_KEY];
  const completed = !!read?.completed_at;

  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadedRef = useRef<Set<number>>(new Set());
  const seen = useRef<Set<number>>(new Set());
  const [maxSeen, setMaxSeen] = useState(0);
  const autoCompletedRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const idx = Number((e.target as HTMLElement).dataset.idx);
          if (!loadedRef.current.has(idx)) return;
          if (idx > 0 && !seen.current.has(idx - 1)) return;
          seen.current.add(idx);
          setMaxSeen((m) => Math.max(m, seen.current.size));
        });
      },
      { threshold: 0.6 }
    );
    observerRef.current = observer;
    return () => observer.disconnect();
  }, []);

  const handleImgLoad = (i: number) => {
    loadedRef.current.add(i);
    const el = refs.current[i];
    if (el && observerRef.current) observerRef.current.observe(el);
  };


  useEffect(() => {
    if (maxSeen === 0) return;
    const pct = Math.round((maxSeen / PAGES.length) * 100);
    markProgress(CONTENT_KEY, pct);
    if (pct >= 90 && !completed && !autoCompletedRef.current) {
      autoCompletedRef.current = true;
      markCompleted(CONTENT_KEY);
      toast.success("Als gelesen markiert ✓", {
        description: "Stark, dass du dir die Zeit genommen hast.",
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
    <div className="min-h-screen text-foreground flex flex-col">
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
            Vom Hi zum 115 € Abschluss
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
              download="SheX_Chat_Breakdown_01.pdf"
              className="inline-flex items-center gap-2 rounded-lg bg-accent text-black text-xs sm:text-sm font-bold px-3 py-2 hover:brightness-110 transition"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
          </div>
        </div>
        {/* Progress bar + % */}
        <div className="max-w-4xl mx-auto px-4 pb-2 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-secondary/40 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"
              initial={{ width: 0 }}
              animate={{ width: `${completed ? 100 : Math.round((maxSeen / PAGES.length) * 100)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="text-[11px] font-bold text-muted-foreground tabular-nums whitespace-nowrap">
            {completed ? 100 : Math.round((maxSeen / PAGES.length) * 100)}% gelesen · Seite {Math.min(maxSeen, PAGES.length)}/{PAGES.length}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6 space-y-4">
        {useReactVersion ? (
          <>
            <ChatBreakdownReact />
            {/* Bottom sentinel to mark as read once user scrolled through */}
            <div
              ref={(el) => {
                if (!el) return;
                const io = new IntersectionObserver(
                  ([e]) => {
                    if (e.isIntersecting) {
                      setMaxSeen(PAGES.length);
                      io.disconnect();
                    }
                  },
                  { threshold: 0.6 }
                );
                io.observe(el);
              }}
              className="h-2"
            />
          </>
        ) : (
          PAGES.map((src, i) => (
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
                onLoad={() => handleImgLoad(i)}
                className="w-full h-auto block"
              />
            </motion.div>
          ))
        )}

        <AnimatePresence>
          {completed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 py-4 font-bold"
            >
              <Check className="h-5 w-5" />
              {lang === "en" ? "Done – you've read this PDF." : "Erledigt – du hast diese PDF gelesen."}
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
            {lang === "en"
              ? (completed ? "Mark as unread" : "Mark as read")
              : (completed ? "Als ungelesen markieren" : "Als gelesen markieren")}
          </button>
          <a
            href={PDF_URL}
            download="SheX_Chat_Breakdown_01.pdf"
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
