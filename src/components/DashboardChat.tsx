import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const QUICK_QUESTIONS = [
  "Wann wird ausgezahlt?",
  "Wie erhöhe ich meine Rate?",
  "Technische Probleme",
];

interface DashboardChatProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export default function DashboardChat({ externalOpen, onExternalOpenChange }: DashboardChatProps) {
  const [open, setOpen] = useState(false);

  // Sync external open state
  useEffect(() => {
    if (externalOpen) {
      setOpen(true);
      onExternalOpenChange?.(false);
    }
  }, [externalOpen, onExternalOpenChange]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Fehler beim Verbinden" }));
        toast.error(err.error || "Fehler beim Verbinden mit dem KI-Support.");
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No stream body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Verbindung zum KI-Support fehlgeschlagen.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center gold-glow-strong hover:scale-110 transition-transform"
        aria-label="Chat öffnen"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 z-50 w-full sm:bottom-6 sm:right-6 sm:w-[400px] sm:max-h-[600px] flex flex-col glass-card rounded-t-2xl sm:rounded-2xl overflow-hidden border border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <span className="text-sm font-semibold text-foreground"><span className="grayscale-0 sepia saturate-[5] hue-rotate-[10deg] brightness-110 inline-block">🧠</span> Sebastian's Mastermind KI</span>
          <p className="text-[11px] text-muted-foreground/80 mt-1 leading-relaxed">Diese KI wurde persönlich von Sebastian trainiert und hilft dir bei den meisten Fragen direkt weiter.</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground shrink-0 ml-2">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px]">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Häufige Fragen:</p>
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="block w-full text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors text-foreground"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex gap-2 p-4 border-t border-border"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Frage stellen..."
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
