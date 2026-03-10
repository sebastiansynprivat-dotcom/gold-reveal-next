import { useState } from "react";
import { useProgress } from "@/hooks/useProgress";
import { motion } from "framer-motion";
import GoldParticles from "@/components/GoldParticles";
import SocialProofBar from "@/components/SocialProofBar";

import VideoThumbnail from "@/components/VideoThumbnail";
import LandingActivityTicker from "@/components/LandingActivityTicker";
import ExitIntentPopup from "@/components/ExitIntentPopup";

const Index = () => {
  const { updateProgress } = useProgress();
  const [showButton, setShowButton] = useState(false);

  const handleVideoProgress = (percent: number) => {
    if (percent >= 0.9 && !showButton) {
      setShowButton(true);
      updateProgress({ video_completed: true, current_step: "quiz" });
    }
  };

  const handleVideoEnd = () => {
    if (!showButton) {
      setShowButton(true);
      updateProgress({ video_completed: true, current_step: "quiz" });
    }
  };

  return (
    <div className="min-h-screen md:min-h-screen h-[100dvh] md:h-screen flex flex-col items-center justify-start px-3 sm:px-4 py-8 md:py-6 lg:py-8 relative overflow-hidden md:overflow-auto">
      <GoldParticles spawnRate={0.5} maxParticles={35} baseOpacity={0.3} />
      <ExitIntentPopup />

      <motion.h1
        initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center tracking-tight leading-tight mb-4 md:mb-3 max-w-2xl px-1"
      >
        <span className="gold-gradient-text">Lerne </span>
        <span className="text-gold-gradient-shimmer">wie du mit Chatten Geld verdienen kannst</span>
      </motion.h1>

      <SocialProofBar />
      <UrgencyCountdown />

      <div className="w-full max-w-[1100px] flex flex-col lg:flex-row gap-4 md:gap-4 mb-2 md:mb-2 items-start justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[700px] lg:max-w-[800px]"
        >
          <VideoThumbnail
            embedUrl="https://www.loom.com/embed/9f2ffec1693c47d0b05bd787a96b1292?sid=auto&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true"
            onVideoProgress={handleVideoProgress}
            onVideoEnd={handleVideoEnd}
          />
          <LandingActivityTicker />
        </motion.div>

        {showButton && (
          <div className="w-full lg:w-[280px] shrink-0 animate-fade-in">
            <div className="glass-card-subtle rounded-xl p-5 space-y-4 text-sm h-full">
              <div className="flex items-start gap-2">
                <span>📁</span>
                <span className="text-foreground">
                  Der Chat den wir im Coaching durch gegangen sind als PDF 👉🏻{" "}
                  <a href="https://drive.google.com/file/d/1RfhdcJKDyY3Uu4O94SlUQJ2MRKLCurfx/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">PDF öffnen</a>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span>📁</span>
                <span className="text-foreground">
                  Fortsetzung des Coaching Chats am nächsten Tag 👉🏻{" "}
                  <a href="https://drive.google.com/file/d/1v-eVMarJsuprLMgmuqm713b1_hNFMKZS/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">PDF öffnen</a>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span>📁</span>
                <span className="text-foreground">
                  Chatverlauf mit einem komplizierteren Kunden (Einwandsbehandlung) 👉🏻{" "}
                  <a href="https://drive.google.com/file/d/11LVnjZAbh8JRMfwnOAvzNq7EtU5r90HL/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">PDF öffnen</a>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span>⭐️</span>
                <span className="text-foreground">
                  Lies dir unsere Bewertungen bei Trustpilot durch 👉🏻{" "}
                  <a href="https://de.trustpilot.com/review/she-x.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">Trustpilot öffnen</a>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {!showButton && (
        <p className="text-muted-foreground text-xs sm:text-sm text-center max-w-sm sm:max-w-md mb-4 md:mb-4 px-2">
          Bitte schau das Video vollständig an. Erst danach erscheint der Button, der dich zum nächsten Schritt führt.
        </p>
      )}

      {/* Sticky CTA on mobile when button is visible */}
      {showButton && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-gradient-to-t from-background via-background/95 to-transparent md:hidden">
          <a
            href="/quiz"
            className="block w-full text-center px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-base tracking-wide gold-glow hover:gold-glow-strong transition-all duration-300 pulse-glow"
          >
            Weiter zum nächsten Schritt →
          </a>
        </div>
      )}

      {/* Desktop CTA (inline) */}
      <div className={`transition-all duration-1000 ease-out md:mt-0 -mt-4 ${showButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"} ${showButton ? "mb-20 md:mb-0" : ""}`}>
        <a
          href="/quiz"
          className="inline-block px-10 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg tracking-wide gold-glow hover:gold-glow-strong hover:scale-105 transition-all duration-300 pulse-glow"
        >
          Weiter zum nächsten Schritt →
        </a>
      </div>
    </div>
  );
};

export default Index;
