import { useState, useEffect, useRef, useCallback } from "react";

const Index = () => {
  const [showButton, setShowButton] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerReadyRef = useRef(false);

  // Listen for Loom player.js postMessage events
  const handleMessage = useCallback((event: MessageEvent) => {
    // Only process messages from Loom
    if (!event.origin.includes("loom.com")) return;

    try {
      const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

      // player.js ready event – register for timeupdate
      if (data?.context === "player.js" && data?.event === "ready" && !playerReadyRef.current) {
        playerReadyRef.current = true;
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            context: "player.js",
            method: "addEventListener",
            value: "timeupdate",
          }),
          "*"
        );
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            context: "player.js",
            method: "addEventListener",
            value: "ended",
          }),
          "*"
        );
      }

      // Video ended
      if (data?.context === "player.js" && data?.event === "ended") {
        setShowButton(true);
      }

      // Fallback: timeupdate – show button when >= 90% watched
      if (data?.context === "player.js" && data?.event === "timeupdate" && data?.value) {
        const { seconds, duration } = data.value;
        if (duration > 0 && seconds / duration >= 0.9) {
          setShowButton(true);
        }
      }
    } catch {
      // Ignore non-JSON messages
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-12 md:py-20">

      {/* Headline */}
      <h1 className="gold-gradient-text text-3xl md:text-5xl font-bold text-center tracking-tight leading-tight mb-10 max-w-2xl">
        Lerne wie du mit Chatten Geld verdienen kannst
      </h1>

      {/* Video + Sidebar Layout */}
      <div className="w-full max-w-[1100px] flex flex-col lg:flex-row gap-6 mb-12 items-start justify-center">
        {/* Video – immer max 800px */}
        <div className="w-full max-w-[800px] gold-border-glow rounded-xl overflow-hidden">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              ref={iframeRef}
              src="https://www.loom.com/embed/a35ff06ac2254fa5bd9aea1de765235f?sid=auto&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true"
              frameBorder="0"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen"
            />
          </div>
        </div>

        {/* Resource Links – rechts vom Video */}
        {showButton && (
          <div className="w-full lg:w-[280px] shrink-0 animate-fade-in">
          <div className="glass-card-subtle rounded-xl p-5 space-y-4 text-sm h-full">
            <div className="flex items-start gap-2">
              <span>📁</span>
              <span className="text-foreground">
                Der Chat den wir im Coaching durch gegangen sind als PDF 👉🏻{" "}
                <a href="https://drive.google.com/file/d/1RfhdcJKDyY3Uu4O94SlUQJ2MRKLCurfx/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">
                  PDF öffnen
                </a>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span>📁</span>
              <span className="text-foreground">
                Fortsetzung des Coaching Chats am nächsten Tag 👉🏻{" "}
                <a href="https://drive.google.com/file/d/1v-eVMarJsuprLMgmuqm713b1_hNFMKZS/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">
                  PDF öffnen
                </a>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span>📁</span>
              <span className="text-foreground">
                Chatverlauf mit einem komplizierteren Kunden (Einwandsbehandlung) 👉🏻{" "}
                <a href="https://drive.google.com/file/d/11LVnjZAbh8JRMfwnOAvzNq7EtU5r90HL/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">
                  PDF öffnen
                </a>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span>⭐️</span>
              <span className="text-foreground">
                Lies dir unsere Bewertungen bei Trustpilot durch 👉🏻{" "}
                <a href="https://de.trustpilot.com/review/she-x.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">
                  Trustpilot öffnen
                </a>
              </span>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-muted-foreground text-sm text-center max-w-md mb-10">
        Bitte schau das Video vollständig an. Erst danach erscheint der Button, der dich zum nächsten Schritt führt.
      </p>

      {/* CTA Button */}
      <div
        className={`transition-all duration-1000 ease-out ${
          showButton
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <a
          href="/quiz"
          className="inline-block px-10 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg tracking-wide gold-glow hover:gold-glow-strong hover:scale-105 transition-all duration-300"
        >
          Weiter zum nächsten Schritt →
        </a>
      </div>

    </div>
  );
};

export default Index;
