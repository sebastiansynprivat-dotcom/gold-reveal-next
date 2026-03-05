import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import type { QuizQuestion } from "@/data/quizQuestions";
import logo from "@/assets/logo.png";

interface QuizResultProps {
  questions: QuizQuestion[];
  answers: number[];
  onRestart: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

const CircularProgress = ({ percentage }: { percentage: number }) => {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-44 h-44">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="hsl(0 0% 10%)" strokeWidth="4" />
        <motion.circle
          cx="70" cy="70" r={radius} fill="none"
          stroke="url(#goldGradient)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
        />
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(43 60% 40%)" />
            <stop offset="50%" stopColor="hsl(43 72% 55%)" />
            <stop offset="100%" stopColor="hsl(43 80% 70%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight gold-gradient-text" style={{ fontFamily: "'Playfair Display', serif" }}>{percentage}%</span>
      </div>
    </div>
  );
};

const QuizResult = ({ questions, answers, onRestart }: QuizResultProps) => {
  const { correct, total, percentage, wrongCategories } = useMemo(() => {
    let correct = 0;
    const wrongCats = new Set<string>();

    const EXCLUDED_IDS = [3]; // Questions that don't affect score
    const scoredQuestions = questions.filter((q) => !EXCLUDED_IDS.includes(q.id));

    scoredQuestions.forEach((q) => {
      const i = questions.indexOf(q);
      if (q.type === "multiple-choice") {
        if (answers[i] === q.correctAnswer) correct++;
        else wrongCats.add(q.category);
      } else {
        if (answers[i] === 0) correct++;
        else wrongCats.add(q.category);
      }
    });

    return {
      correct,
      total: scoredQuestions.length,
      percentage: Math.round((correct / questions.length) * 100),
      wrongCategories: Array.from(wrongCats),
    };
  }, [questions, answers]);

  const coachingTips: Record<string, { tip: string; url: string }> = {
    "Kundenpsychologie": { tip: "Verstehe die wahren Beweggründe deiner Kunden. Einsamkeit und persönlicher Austausch sind oft der Hauptantrieb – nutze dieses Wissen empathisch.", url: "https://www.loom.com/share/a35ff06ac2254fa5bd9aea1de765235f?t=234" },
    "Verkaufsstrategie": { tip: "Lerne, Käufer schnell zu identifizieren. Die A- oder B-Methode spart dir wertvolle Zeit und steigert deine Effizienz.", url: "https://www.loom.com/share/a35ff06ac2254fa5bd9aea1de765235f?t=571" },
    "Verkaufsphilosophie": { tip: "Denke daran: Du verkaufst keine Bilder, sondern Emotionen. Dieser Perspektivwechsel ist der Schlüssel zu höheren Umsätzen.", url: "https://www.loom.com/share/a35ff06ac2254fa5bd9aea1de765235f?t=824" },
    "Preisstruktur": { tip: "Die aufbauende Preisstruktur ist essenziell. Starte kostenlos und steigere schrittweise – so maximierst du den Kundenwert.", url: "https://www.loom.com/share/a35ff06ac2254fa5bd9aea1de765235f?t=1387" },
    "Content-Strategie": { tip: "Gib nie zu viel auf einmal preis. Der aufbauende Content-Ansatz sorgt dafür, dass Kunden immer einen Grund haben, mehr zu kaufen.", url: "https://www.loom.com/share/a35ff06ac2254fa5bd9aea1de765235f?t=974" },
    "Zeitmanagement": { tip: "Verschwende keine Zeit mit Nicht-Käufern. Erkenne schnell, wann du weiterziehen musst.", url: "https://www.loom.com/share/a35ff06ac2254fa5bd9aea1de765235f?t=436" },
    "Gesprächsführung": { tip: "Der natürliche Übergang zum Verkauf ist eine Kunst. Nutze fiktive Storys, um das Thema elegant zu wechseln.", url: "https://www.loom.com/share/a35ff06ac2254fa5bd9aea1de765235f?t=1724" },
    "Mindset": { tip: "Lass dich von Nicht-Käufern nicht entmutigen. Jeder Chat bringt dich statistisch näher an den nächsten Verkauf.", url: "https://www.loom.com/share/a35ff06ac2254fa5bd9aea1de765235f?t=438" },
    "Gesprächsabschluss": { tip: "Ein guter Abschluss sichert den nächsten Verkauf. Beende Gespräche immer positiv und persönlich.", url: "https://www.loom.com/share/a35ff06ac2254fa5bd9aea1de765235f?t=2870" },
    "Kundenbindung": { tip: "Pflege deine Kundenbeziehungen aktiv. Eine lockere Nachricht am nächsten Morgen stärkt die Bindung enorm.", url: "" },
  };

  const isPerfect = percentage === 100;

  useEffect(() => {
    if (isPerfect) {
      const gold = "hsl(43, 72%, 55%)";
      const goldLight = "hsl(43, 80%, 70%)";
      const goldDark = "hsl(43, 60%, 40%)";
      const fire = (opts: confetti.Options) => confetti({ ...opts, colors: [gold, goldLight, goldDark, "#fff"], disableForReducedMotion: true });
      setTimeout(() => {
        fire({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
        fire({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
      }, 800);
      setTimeout(() => { fire({ particleCount: 40, angle: 90, spread: 80, origin: { x: 0.5, y: 0.6 } }); }, 1200);
    }
  }, [isPerfect]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col items-center min-h-screen px-6 py-20">
      <motion.img src={logo} alt="SHE Logo" className="w-16 h-16 mb-8 opacity-80" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 0.8 }} transition={{ duration: 0.8, ease }} />

      <motion.h1 className="text-3xl md:text-4xl gold-gradient-text mb-1 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.8, ease }}>
        Dein Ergebnis
      </motion.h1>

      <motion.p className="text-muted-foreground/60 mb-10 text-sm" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25, duration: 0.8, ease }}>
        {correct} von {total} richtig
      </motion.p>

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.35, duration: 0.8, ease }}>
        <CircularProgress percentage={percentage} />
      </motion.div>

      {wrongCategories.length > 0 && (
        <motion.div className="w-full max-w-md mt-14" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8, duration: 0.8, ease }}>
          <h2 className="text-lg gold-gradient-text mb-2 text-center" style={{ fontFamily: "'Playfair Display', serif" }}>Du musst noch etwas lernen 🧠</h2>
          <p className="text-foreground/90 text-sm leading-relaxed mb-6 text-center">Schau dir die Optimierungen unten an und wiederhole dann das Quiz nochmal. Erst ab 100% richtige Fragen können wir gemeinsam starten.</p>
          <h3 className="text-xs uppercase tracking-[0.2em] text-primary/50 mb-6 text-center font-medium">Optimierungspotenzial</h3>
          <div className="space-y-2.5">
            {wrongCategories.map((cat, i) => (
              <motion.div key={cat} className="p-4 rounded-xl glass-card-subtle" initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 1 + i * 0.1, duration: 0.5, ease }}>
                <h3 className="text-primary/80 font-semibold mb-1 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{cat}</h3>
                <p className="text-muted-foreground/60 text-xs leading-relaxed mb-3">{coachingTips[cat]?.tip || "Beschäftige dich intensiver mit diesem Thema in deinem nächsten Coaching."}</p>
                {coachingTips[cat]?.url && (
                  <a href={coachingTips[cat].url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary/80 hover:text-primary transition-colors duration-300">
                    Zur Coaching Stelle →
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {wrongCategories.length === 0 && (
        <motion.div className="mt-14 p-6 rounded-xl glass-card max-w-md text-center" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8, duration: 0.8, ease }}>
          <h2 className="text-lg gold-gradient-text mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Perfektes Ergebnis ✨</h2>
          <p className="text-foreground text-base leading-relaxed mb-6 font-medium">Nun folgt der letzte Schritt: Die Einführung in die Plattform auf der du arbeiten wirst.</p>
          <WeightedRouteButton />
        </motion.div>
      )}

      {!isPerfect && (
        <motion.button onClick={onRestart} className="mt-14 px-12 py-4 rounded-xl bg-primary text-primary-foreground font-semibold tracking-wide transition-all duration-500 gold-glow hover:gold-glow-strong" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2, duration: 0.8, ease }} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
          Quiz wiederholen
        </motion.button>
      )}
    </motion.div>
  );
};

const WeightedRouteButton = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      const { data: routes } = await supabase
        .from("quiz_routes")
        .select("target_path, weight")
        .eq("is_active", true);

      if (!routes || routes.length === 0) {
        navigate("/offer-a");
        return;
      }

      // Get and increment the global counter for deterministic distribution
      const { data: counterRow } = await supabase
        .from("route_counter")
        .select("id, counter")
        .limit(1)
        .single();

      const currentCounter = counterRow?.counter || 0;

      // Increment counter
      if (counterRow) {
        await supabase
          .from("route_counter")
          .update({ counter: currentCounter + 1 })
          .eq("id", counterRow.id);
      }

      // Deterministic: use counter modulo total weight to pick route
      const totalWeight = routes.reduce((sum, r) => sum + r.weight, 0);
      const position = currentCounter % totalWeight;
      let accumulated = 0;
      let selectedPath = routes[0].target_path;

      for (const route of routes) {
        accumulated += route.weight;
        if (position < accumulated) {
          selectedPath = route.target_path;
          break;
        }
      }

      navigate(selectedPath);
    } catch {
      navigate("/offer-a");
    }
  };

  return (
    <motion.button
      onClick={handleContinue}
      disabled={loading}
      className="px-10 py-4 rounded-xl bg-primary text-primary-foreground font-semibold tracking-wide transition-all duration-500 gold-glow hover:gold-glow-strong disabled:opacity-50"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {loading ? "Bitte warten..." : "Weiter →"}
    </motion.button>
  );
};

export default QuizResult;
