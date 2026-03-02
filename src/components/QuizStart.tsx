import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

interface QuizStartProps {
  onStart: () => void;
}

const QuizStart = ({ onStart }: QuizStartProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
    >
      <motion.img
        src={logo}
        alt="SheX Logo"
        className="w-24 h-24 mb-8 rounded-full"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.h1
        className="text-[clamp(1.75rem,6vw,3rem)] font-serif text-gold-gradient mb-4 whitespace-nowrap"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Dein Coaching Quiz
      </motion.h1>

      <motion.p
        className="text-muted-foreground/70 max-w-sm mb-14 text-base leading-relaxed"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        Finde heraus, wo du stehst – und welche Themen dich auf das nächste Level bringen.
      </motion.p>

      <motion.button
        onClick={onStart}
        className="px-12 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base tracking-wide gold-glow hover:gold-glow-strong transition-shadow duration-500"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97 }}
      >
        Quiz starten
      </motion.button>

      <motion.span
        className="mt-5 text-[11px] text-muted-foreground/40 tracking-widest uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
      >
        11 Fragen · ca. 7 Min.
      </motion.span>
    </motion.div>
  );
};

export default QuizStart;
