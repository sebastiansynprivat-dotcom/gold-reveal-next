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

      {/* Video Container */}
      <div className="w-full max-w-[800px] gold-border-glow rounded-xl overflow-hidden mb-12">
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

      {/* Disclaimer */}
      <p className="text-muted-foreground text-sm text-center max-w-md mb-10">
        Bitte schau das Video vollständig an. Erst danach erscheint der Button, der dich zum nächsten Schritt führt.
      </p>

      {/* CTA Button – erscheint nach Video-Completion */}
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
