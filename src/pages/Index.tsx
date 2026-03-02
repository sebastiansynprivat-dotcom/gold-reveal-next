import { useState, useEffect } from "react";

// ============================================================
// KONFIGURATION: Hier die Verzögerung in Sekunden anpassen
// ============================================================
const DELAY_IN_SECONDS = 180; // 3 Minuten (180 Sekunden)
// ============================================================

const Index = () => {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButton(true);
    }, DELAY_IN_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-12 md:py-20">
      {/* Subtle top accent line */}
      <div className="w-20 h-px bg-primary mb-10 opacity-40" />

      {/* Headline */}
      <h1 className="gold-gradient-text text-3xl md:text-5xl font-bold text-center tracking-tight leading-tight mb-10 max-w-2xl">
        Schau jetzt das Coaching Video komplett
      </h1>

      {/* Video Container */}
      <div className="w-full max-w-[800px] gold-border-glow rounded-xl overflow-hidden mb-12">
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src="https://www.loom.com/embed/a35ff06ac2254fa5bd9aea1de765235f?sid=auto&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true"
            frameBorder="0"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen"
          />
        </div>
      </div>

      {/* CTA Button – Fade-in nach Verzögerung */}
      <div
        className={`transition-all duration-1000 ease-out ${
          showButton
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <a
          href="#"
          className="inline-block px-10 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg tracking-wide gold-glow hover:gold-glow-strong hover:scale-105 transition-all duration-300"
        >
          Weiter zum nächsten Schritt →
        </a>
      </div>

      {/* Bottom accent */}
      <div className="mt-auto pt-16">
        <div className="w-10 h-px bg-primary opacity-20" />
      </div>
    </div>
  );
};

export default Index;
