import { motion } from "framer-motion";
import { ArrowLeft, Download } from "lucide-react";
import { Link } from "react-router-dom";

const PDF_URL = "/content/chat-breakdown-01.pdf";

export default function ChatBreakdown() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur-lg bg-background/80 border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Link>
          <h1 className="text-sm sm:text-base font-bold tracking-wide uppercase text-gold-gradient truncate">
            Vom Hi zum $135 Close
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

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex-1 max-w-6xl w-full mx-auto p-2 sm:p-4"
      >
        <div className="rounded-2xl overflow-hidden border border-border/60 shadow-[0_0_40px_rgba(212,175,55,0.15)] bg-secondary/30">
          <object
            data={PDF_URL}
            type="application/pdf"
            className="w-full h-[calc(100vh-140px)]"
          >
            <iframe
              src={PDF_URL}
              className="w-full h-[calc(100vh-140px)]"
              title="Chat Breakdown PDF"
            />
            <div className="p-8 text-center text-sm text-muted-foreground">
              Dein Browser kann das PDF nicht direkt anzeigen.{" "}
              <a href={PDF_URL} download className="text-accent underline">
                Hier herunterladen
              </a>
            </div>
          </object>
        </div>
      </motion.main>
    </div>
  );
}
