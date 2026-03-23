import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Lock, ChevronDown, ExternalLink } from "lucide-react";
import logo from "@/assets/logo.png";
import exampleNotifications from "@/assets/example-brezzels-notifications.jpeg";
import exampleMyIdBot from "@/assets/example-myidbot.jpeg";
import GoldenAudioPlayer from "@/components/GoldenAudioPlayer";
import StepBadge from "@/components/StepBadge";
import LoomVideoStep from "@/components/LoomVideoStep";

const ease = [0.16, 1, 0.3, 1] as const;

const COUNTDOWN_KEY = "offerC-countdown-start";
const COUNTDOWN_DURATION = 2 * 60 * 60 * 1000; // 2 hours

const getTimeLeft = () => {
  try {
    let start = sessionStorage.getItem(COUNTDOWN_KEY);
    if (!start) {
      start = String(Date.now());
      sessionStorage.setItem(COUNTDOWN_KEY, start);
    }
    const elapsed = Date.now() - parseInt(start, 10);
    return Math.max(0, COUNTDOWN_DURATION - elapsed);
  } catch {
    return COUNTDOWN_DURATION;
  }
};

const formatCountdown = (ms: number) => {
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms / (1000 * 60)) % 60);
  const s = Math.floor((ms / 1000) % 60);
  return { h, m, s };
};

const pad = (n: number) => String(n).padStart(2, "0");

const steps = [
  { id: 1, title: "Plattform Erklärungs Video anschauen" },
  { id: 2, title: "Telegram Nachrichten Video anschauen" },
  { id: 3, title: "FansyMe Notifications aktivieren" },
  { id: 4, title: "My ID Bot einrichten" },
];

const videos = [
  {
    step: 1,
    title: "Plattform Erklärungs Video",
    embedUrl: "https://www.loom.com/embed/e05514625bb54af192324d6d51be1f27?sid=1&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true",
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
    title: "FansyMe Notifications",
    description: "Aktiviere Benachrichtigungen damit du keine Nachricht verpasst",
    url: "https://t.me/notifications_fansyme_bot",
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

const STORAGE_KEY = "offerc-completed-steps";

const loadCompleted = (): Set<number> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
};

const OfferC = () => {
  const [showPopup, setShowPopup] = useState(true);
  const [showHowTo, setShowHowTo] = useState(false);
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(loadCompleted);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const countdown = formatCountdown(timeLeft);

  return (
    <div className="min-h-screen">
      {/* Sticky Urgency Bar */}
      <AnimatePresence>
        {!showPopup && timeLeft > 0 && (
          <motion.div
            className="fixed top-0 left-0 right-0 z-40"
            initial={{ y: -60 }}
            animate={{ y: 0 }}
            exit={{ y: -60 }}
            transition={{ duration: 0.5, ease }}
          >
            <div className="bg-background/80 backdrop-blur-xl border-b border-primary/15 px-4 py-2.5">
              <div className="max-w-3xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Dein Platz ist reserviert
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <Clock className="w-3.5 h-3.5 text-primary/70" />
                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                    {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <span className="text-4xl mb-3">🎉</span>
              <h2 className="gold-gradient-text text-xl md:text-2xl font-bold mb-1">
                Glückwunsch – dein Platz ist reserviert!
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Schließe die Einrichtung ab, um deinen Platz zu sichern.
              </p>

              {/* Countdown in Popup */}
              <div className="flex items-center gap-2 mb-5 bg-primary/5 border border-primary/10 rounded-lg px-4 py-2">
                <Clock className="w-4 h-4 text-primary/70" />
                <span className="text-sm text-muted-foreground">Reserviert für</span>
                <span className="font-mono font-bold text-primary text-sm">
                  {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
                </span>
              </div>

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
                Jetzt einrichten & Platz sichern 🔒
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`px-4 py-12 md:py-20 ${!showPopup && timeLeft > 0 ? "pt-24 md:pt-28" : ""}`}>
        {/* Hero */}
        <motion.div
          className="flex flex-col items-center text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
        >
          <img src={logo} alt="SHE Logo" className="w-16 h-16 mb-6 opacity-80" />
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-3">
            <span className="text-foreground">Kurze Anleitung für deinen Start mit </span>
            <span className="text-[hsl(210,100%,50%)]">FansyMe</span>
          </h1>
          <p className="text-muted-foreground text-base max-w-md">
            Schau dir alle Videos an und richte alles Schritt für Schritt ein.
          </p>
        </motion.div>

        {/* Motivation Banner */}
        <motion.div
          className="max-w-3xl mx-auto mb-14"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7, ease }}
        >
          <div className="glass-card-subtle rounded-xl px-5 py-4 border border-primary/10 text-center">
            <p className="text-sm md:text-base text-foreground font-medium">
              ✅ Du hast es geschafft! Jetzt nur noch ein paar kurze Schritte und du kannst loslegen und{" "}
              <span className="gold-gradient-text font-bold">Geld verdienen</span>.
            </p>
          </div>
        </motion.div>

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
          <h2 className="gold-gradient-text text-xl md:text-2xl font-bold mb-6 text-center">
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

          {/* How-To Hint */}
          <button
            onClick={() => setShowHowTo(!showHowTo)}
            className="mt-6 w-full flex items-center justify-center gap-2 text-sm text-primary/80 hover:text-primary transition-colors py-2"
          >
            <span className="font-medium">Wie schicke ich das in die Gruppe?</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showHowTo ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showHowTo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease }}
                className="overflow-hidden"
              >
                <div className="glass-card-subtle rounded-xl p-5 mt-3 space-y-5">
                  <p className="text-sm text-foreground font-medium text-center">
                    Bitte schicke folgendes in deine WhatsApp-Gruppe:
                  </p>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      1️⃣ Einen <span className="text-foreground font-semibold">Screenshot</span>, wie du <span className="font-mono text-primary">/start</span> im Notifications-Bot geschickt hast
                    </p>
                    <p className="text-sm text-muted-foreground">
                      2️⃣ Deine <span className="text-foreground font-semibold">kopierte Nummer</span> vom My ID Bot
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      ⚠️ <span className="text-foreground font-semibold">Wichtig:</span> Es sind zwei Screenshots von zwei verschiedenen Bots. Bitte beachten!
                    </p>
                  </div>

                  <div className="border-t border-primary/10 pt-4">
                    <p className="text-xs text-muted-foreground text-center mb-4 font-medium uppercase tracking-wide">
                      Hier ist ein Beispiel
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Notifications Bot Example */}
                      <div className="space-y-3">
                        <div className="rounded-lg overflow-hidden border border-primary/10">
                          <img src={exampleNotifications} alt="Beispiel Notifications Bot" className="w-full" />
                        </div>
                        <a
                          href="https://t.me/notifications_fansyme_bot"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                        >
                          <ExternalLink className="w-3 h-3" />
                          FansyMe Notifications öffnen
                        </a>
                      </div>

                      {/* My ID Bot Example */}
                      <div className="space-y-3">
                        <div className="rounded-lg overflow-hidden border border-primary/10">
                          <img src={exampleMyIdBot} alt="Beispiel My ID Bot" className="w-full" />
                        </div>
                        <a
                          href="https://t.me/myidbot"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                        >
                          <ExternalLink className="w-3 h-3" />
                          My ID Bot öffnen
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default OfferC;
