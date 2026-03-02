import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";

const ease = [0.16, 1, 0.3, 1] as const;

const videos = [
  {
    title: "Mass DM System",
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

const feedbackTemplate = `Feedback zum heutigen Tag:

Umsatz:
MassDMs gesendet:
Was lief gut?:
Was lief schlecht?:
Offene Fragen (optional)`;

const OfferA = () => {
  const [showPopup, setShowPopup] = useState(true);

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
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Eine kleine Nachricht von Sebastian an dich
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                Hör dir kurz die Nachricht an, bevor du loslegst.
              </p>
              <audio
                controls
                className="w-full mb-6 rounded-lg"
                src="/audio/welcome-message.mp3"
              />
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
        className="flex flex-col items-center text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease }}
      >
        <img src={logo} alt="SHE Logo" className="w-16 h-16 mb-6 opacity-80" />
        <h1
          className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          <span className="text-foreground">Kurze Anleitung für deinen Start mit </span>
          <span className="text-[hsl(14,100%,50%)]">Maloum</span>
        </h1>
        <p className="text-muted-foreground text-base max-w-md">
          Schau dir alle Videos an und richte alles Schritt für Schritt ein.
        </p>
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
            <h2
              className="gold-gradient-text text-xl md:text-2xl font-bold mb-4 text-center"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
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
        <h2
          className="gold-gradient-text text-xl md:text-2xl font-bold mb-6 text-center"
          style={{ fontFamily: "'Playfair Display', serif" }}
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

      {/* Feedback Section */}
      <motion.div
        className="max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.8, ease }}
      >
        <h2
          className="gold-gradient-text text-xl md:text-2xl font-bold mb-2 text-center"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Tägliches Feedback
        </h2>
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

export default OfferA;
