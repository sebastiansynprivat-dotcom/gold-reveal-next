import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, FileText, TrendingUp, Sparkles, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLibraryReads } from "@/hooks/useLibraryReads";

const libraryItems = [
  {
    icon: TrendingUp,
    title: "Vom Hi zum 115 € Abschluss",
    subtitle: "Echter Chat, Nachricht für Nachricht erklärt",
    accent: "from-amber-400/30 to-amber-600/5",
    route: "/bibliothek/chat-breakdown-01",
    contentKey: "chat-breakdown-01",
  },
  {
    icon: Sparkles,
    title: "Verkaufs-Skripte",
    subtitle: "Wort-für-Wort Vorlagen, die wirklich kaufen lassen",
    accent: "from-yellow-400/20 to-yellow-600/5",
    route: "/bibliothek/verkaufs-skripte",
    contentKey: "sales-scripts",
  },
  {
    icon: FileText,
    title: "Coaching Basics",
    subtitle: "Die Basics, die jeder Top-Chatter beherrscht",
    accent: "from-amber-300/20 to-amber-500/5",
    route: "/bibliothek/coaching-basics",
    contentKey: "coaching-basics",
  },
];

export default function Library() {
  const navigate = useNavigate();
  const { reads } = useLibraryReads();

  const doneCount = libraryItems.filter((p) => reads[p.contentKey]?.completed_at).length;
  const totalCount = libraryItems.length;
  const overallPct = Math.round((doneCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-6 lg:py-10">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/40 blur-lg rounded-full animate-pulse" />
              <BookOpen className="h-7 w-7 text-accent relative" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-wide uppercase">
              Inspirations-Bibliothek
            </h1>
          </div>
          <p className="text-sm lg:text-base text-muted-foreground leading-snug">
            Alle PDFs, Skripte und Breakdowns an einem Ort. Chatter, die diese Inhalte durcharbeiten, machen im Schnitt{" "}
            <span className="text-gold-gradient font-bold">2× so viel Umsatz</span>.
          </p>
        </motion.div>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-secondary/60 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"
              initial={{ width: 0 }}
              animate={{ width: `${overallPct}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
            {doneCount} / {totalCount} gelesen
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {libraryItems.map((item, i) => {
            const { icon: Icon, title, subtitle, accent, contentKey, route } = item;
            const r = reads[contentKey];
            const isDone = !!r?.completed_at;
            const pct = r?.progress_pct ?? 0;
            const inProgress = !isDone && pct > 0;

            return (
              <motion.button
                key={title}
                onClick={() => navigate(route)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`group relative text-left rounded-xl border bg-gradient-to-br ${accent} bg-secondary/30 p-5 transition-all ${
                  isDone
                    ? "border-emerald-500/50"
                    : "border-border/60 hover:border-accent/60 hover:shadow-[0_0_24px_rgba(212,175,55,0.25)]"
                }`}
              >
                {isDone ? (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-[10px] font-bold px-2 py-0.5">
                    <Check className="h-3 w-3" />
                    GELESEN
                  </span>
                ) : inProgress ? (
                  <span className="absolute top-3 right-3 rounded-full bg-accent/20 border border-accent/50 text-accent text-[10px] font-bold px-2 py-0.5">
                    {pct}%
                  </span>
                ) : (
                  <span className="absolute top-3 right-3 rounded-full bg-accent text-black text-[10px] font-bold px-2 py-0.5 tracking-wider">
                    NEU
                  </span>
                )}

                <Icon className={`h-7 w-7 mb-3 group-hover:scale-110 transition-transform ${isDone ? "text-emerald-400" : "text-accent"}`} />
                <p className="text-base font-bold mb-1 leading-tight">{title}</p>
                <p className="text-xs text-muted-foreground leading-snug mb-3">{subtitle}</p>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                    <motion.div
                      className={`h-full ${isDone ? "bg-emerald-400" : "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${isDone ? 100 : pct}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-[10px] font-bold tabular-nums text-muted-foreground whitespace-nowrap">
                    {isDone ? 100 : pct}%
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Coming soon hint */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Weitere Inhalte folgen – die Bibliothek wird laufend erweitert.
        </p>
      </div>
    </div>
  );
}
