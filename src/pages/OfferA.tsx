import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Lock, ChevronDown, ExternalLink } from "lucide-react";
import logo from "@/assets/logo.png";
import exampleNotifications from "@/assets/example-notifications.jpeg";
import exampleMyIdBot from "@/assets/example-myidbot.jpeg";
import GoldenAudioPlayer from "@/components/GoldenAudioPlayer";

const ease = [0.16, 1, 0.3, 1] as const;

const COUNTDOWN_KEY = "offerA-countdown-start";
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

const videos = [
  {
    title: "Mass DM System: So hast du Leute zum schreiben mit denen du dann Geld verdienen kannst:",
    embedUrl: "https://www.loom.com/embed/ffb4a4cd46ef49d1be746a9161d5f21c?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true",
  },
  {
    title: "Plattform Erklärungs Video",
    embedUrl: "https://www.loom.com/embed/9223723737e74705b735d3cc3065814b?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true",
  },
  {
    title: "Telegram Nachrichten",
    embedUrl: "https://www.loom.com/embed/1b51469e8a524c26a98ba36d94142ffe?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true",
  },
];

const links = [
  {
    title: "Maloum Notifications",
    description: "Aktiviere Benachrichtigungen damit du keine Nachricht verpasst",
    url: "https://t.me/Xalvebot",
    icon: "🔔",
  },
  {
    title: "My ID Bot",
    description: "Finde deine Telegram ID für die Einrichtung",
    url: "https://t.me/myidbot",
    icon: "🤖",
  },
];

const OfferA = () => {
  const [showPopup, setShowPopup] = useState(true);
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);
    return () => clearInterval(interval);
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
            <span className="text-[hsl(14,100%,50%)]">Maloum</span>
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
            <motion.div
              key={video.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.8, ease }}
            >
              <h2 className="gold-gradient-text text-xl md:text-2xl font-bold mb-4 text-center">
                {video.title}
              </h2>
              <div className="gold-border-glow rounded-xl overflow-hidden">
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={video.embedUrl}
                    frameBorder="0"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; fullscreen"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Links Section */}
        <motion.div
          className="max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8, ease }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {links.map((link) => (
              <a
                key={link.title}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card-subtle rounded-xl p-5 flex items-start gap-4 hover:scale-[1.02] transition-transform duration-300 group"
              >
                <span className="text-2xl">{link.icon}</span>
                <div>
                  <h3 className="text-foreground font-semibold group-hover:text-primary transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">{link.description}</p>
                </div>
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OfferA;
