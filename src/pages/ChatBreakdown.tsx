import { motion } from "framer-motion";
import { ArrowLeft, Download } from "lucide-react";
import { Link } from "react-router-dom";

const PDF_URL = "/content/chat-breakdown-01.pdf";
const PAGES = Array.from({ length: 10 }, (_, i) => `/content/breakdown-01/page-${String(i + 1).padStart(2, "0")}.jpg`);

export default function ChatBreakdown() {
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
            Vom Hi zum 115 € Abschluss
          </h1>
          <a
            href={PDF_URL}
            download="SheX_Chat_Breakdown_01.pdf"
            className="inline-flex items-center gap-2 rounded-lg bg-accent text-black text-xs sm:text-sm font-bold px-3 py-2 hover:brightness-110 transition"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6 space-y-4">
        {PAGES.map((src, i) => (
          <motion.div
            key={src}
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

        <div className="text-center py-6">
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
