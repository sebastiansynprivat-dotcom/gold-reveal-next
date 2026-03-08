import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";
import ProgressChecklist from "@/components/ProgressChecklist";
import StepBadge from "@/components/StepBadge";
import LoomVideoStep from "@/components/LoomVideoStep";
import GoldenAudioPlayer from "@/components/GoldenAudioPlayer";

const ease = [0.16, 1, 0.3, 1] as const;

const steps = [
  { id: 1, title: "Plattform Erklärungs Video anschauen" },
  { id: 2, title: "Telegram Nachrichten Video anschauen" },
  { id: 3, title: "Brezzels Notifications aktivieren" },
  { id: 4, title: "My ID Bot einrichten" },
  { id: 5, title: "Tägliches Feedback einrichten" },
];

const videos = [
  {
    step: 1,
    title: "Plattform Erklärungs Video",
    embedUrl: "https://www.loom.com/embed/b161be42f5484688b862f8cd5753690b?sid=1&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true",
  },
  {
    step: 2,
    title: "Telegram Nachrichten Video",
    embedUrl: "https://www.loom.com/embed/0582b0ea68b942728a535a98f990660b?sid=1&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true",
  },
];

const links = [
  {
    step: 3,
    title: "Brezzels Notifications",
    description: "Aktiviere Benachrichtigungen damit du keine Nachricht verpasst",
    url: "https://t.me/Notifications_brezzels_bot",
    icon: "🔔",
  },
  {
    step: 4,
    title: "My ID Bot",
    description: "Finde deine Telegram ID für die Einrichtung",
    url: "https://t.me/myidbot",
    icon: "🤖",
  },
];

const feedbackTemplate = `Feedback zum heutigen Tag:

Umsatz:
MassDMs gesendet:
Was lief gut?:
Was lief schlecht?:
Offene Fragen (optional)`;

const STORAGE_KEY = "offerc-completed-steps";

const loadCompleted = (): Set<number> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
};

const OfferC = () => {
  const navigate = useNavigate();
  const [showPopup, setShowPopup] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(loadCompleted);
  const [telegramId, setTelegramId] = useState("");
  const [idSaved, setIdSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedSteps]));
  }, [completedSteps]);

  const markComplete = useCallback((id: number) => {
    setCompletedSteps((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const toggleStep = (id: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(feedbackTemplate);
  };

  return (
    <div className="min-h-screen px-4 py-12 md:py-20">
      {/* Welcome Popup */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowPopup(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md glass-card-subtle rounded-2xl p-8 flex flex-col items-center text-center"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.5, ease }}
            >
              <span className="text-4xl mb-4">👋</span>
              <h2
                className="gold-gradient-text text-xl md:text-2xl font-bold mb-2"
              >
                Eine kleine Nachricht von Sebastian an dich
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                Hör dir kurz die Nachricht an, bevor du loslegst.
              </p>
              <motion.div
                className="w-full mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6, ease }}
              >
                <GoldenAudioPlayer src="/audio/welcome-message.mp3" autoPlay />
              </motion.div>
              <button
                onClick={() => setShowPopup(false)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Los geht's 🚀
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <motion.div
        className="flex flex-col items-center text-center mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease }}
      >
        <img src={logo} alt="SHE Logo" className="w-16 h-16 mb-6 opacity-80" />
        <h1
          className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-3"
        >
          <span className="text-foreground">Kurze Anleitung für deinen Start mit </span>
          <span className="text-[hsl(210,100%,50%)]">Brezzels</span>
        </h1>
        <p className="text-muted-foreground text-base max-w-md">
          Schau dir alle Videos an und richte alles Schritt für Schritt ein.
        </p>
      </motion.div>

      {/* Progress Checklist */}
      <ProgressChecklist
        steps={steps}
        completedSteps={completedSteps}
        onToggle={toggleStep}
      />

      {/* Videos */}
      <div className="max-w-3xl mx-auto space-y-14 mb-16">
        {videos.map((video, i) => (
          <LoomVideoStep
            key={video.step}
            step={video.step}
            title={video.title}
            embedUrl={video.embedUrl}
            completed={completedSteps.has(video.step)}
            onAutoComplete={markComplete}
            animDelay={0.2 + i * 0.15}
          />
        ))}
      </div>

      {/* Links Section */}
      <motion.div
        className="max-w-3xl mx-auto mb-16"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.8, ease }}
      >
        <h2
          className="gold-gradient-text text-xl md:text-2xl font-bold mb-6 text-center"
          >
          Wichtige Links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {links.map((link) => (
            <a
              key={link.title}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`glass-card-subtle rounded-xl p-5 flex items-start gap-4 hover:scale-[1.02] transition-all duration-300 group ${
                completedSteps.has(link.step) ? "opacity-60" : ""
              }`}
            >
              <StepBadge step={link.step} completed={completedSteps.has(link.step)} />
              <div className="flex-1">
                <h3 className="text-foreground font-semibold group-hover:text-primary transition-colors">
                  {link.title}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">{link.description}</p>
              </div>
            </a>
          ))}
        </div>

        {/* Telegram ID – direkt unter Links */}
        {(() => {
          const videosWatched = completedSteps.has(1) && completedSteps.has(2);
          return (
            <div className={`glass-card-subtle rounded-xl p-5 text-center space-y-3 mt-6 relative transition-all duration-500 ${!videosWatched ? "opacity-50 select-none" : ""}`}>
              {!videosWatched && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl backdrop-blur-[2px]">
                  <p className="text-muted-foreground text-sm font-medium bg-background/80 px-4 py-2 rounded-lg">
                    🔒 Verfügbar, wenn du beide Videos geschaut hast
                  </p>
                </div>
              )}
              <h3
                className="gold-gradient-text text-lg font-bold"
              >
                🤖 Deine Telegram ID
              </h3>
              <p className="text-muted-foreground text-sm">
                Trage hier deine Telegram ID ein.
              </p>
              <div className="max-w-[200px] mx-auto input-gold-shimmer rounded-lg">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder=""
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value.replace(/\D/g, ""))}
                  disabled={idSaved || !videosWatched}
                  className="text-center text-sm border-transparent"
                />
              </div>
              {!idSaved ? (
                <Button
                  onClick={() => {
                    if (!telegramId.trim()) {
                      toast.error("Bitte gib deine Telegram ID ein.");
                      return;
                    }
                    localStorage.setItem("pending_telegram_id", telegramId.trim());
                    localStorage.setItem("pending_offer", "Brezzels");
                    setIdSaved(true);
                    toast.success("Telegram ID gespeichert!");
                  }}
                  className="gold-glow hover:gold-glow-strong px-8"
                  disabled={!telegramId.trim() || !videosWatched}
                >
                  ID speichern
                </Button>
              ) : (
                <Button
                  onClick={() => navigate("/auth")}
                  size="lg"
                  className="gold-glow hover:gold-glow-strong text-lg px-10"
                >
                  Zum Dashboard Login →
                </Button>
              )}
            </div>
          );
        })()}
      </motion.div>

      {/* Feedback Section – Schritt 5 */}
      <motion.div
        className={`max-w-3xl mx-auto transition-opacity duration-300 ${completedSteps.has(5) ? "opacity-60" : ""}`}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.8, ease }}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <StepBadge step={5} completed={completedSteps.has(5)} />
          <h2
            className="gold-gradient-text text-xl md:text-2xl font-bold"
            >
            Tägliches Feedback
          </h2>
        </div>
        <p className="text-muted-foreground text-sm text-center mb-6 max-w-md mx-auto">
          Damit wir dich optimal unterstützen können, gib uns bitte 1x am Ende des Tages ein Feedback in folgendem Format:
        </p>
        <div className="glass-card-subtle rounded-xl p-6 relative">
          <pre className="text-foreground/90 text-sm whitespace-pre-wrap leading-relaxed font-sans">
            {feedbackTemplate}
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            Kopieren
          </button>
        </div>
        <p className="text-muted-foreground/60 text-xs text-center mt-3">
          Kopiere einfach die Vorlage und fülle sie einmal am Tag aus
        </p>
      </motion.div>
    </div>
  );
};

export default OfferC;
