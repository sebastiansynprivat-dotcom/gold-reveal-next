import { useState } from "react";
import { HelpCircle, ChevronDown, Sparkles } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const FAQ_DATA: Record<"de" | "en", Array<{ q: string; a: string }>> = {
  de: [
    {
      q: "Wie erhalte ich meine Auszahlung?",
      a: "Die Auszahlung erfolgt automatisch jeden Monat innerhalb der ersten zehn Tage. Du musst lediglich sicherstellen, dass die bei Vertragsunterzeichnung angegebenen Payment-Informationen noch aktuell sind. Falls die Auszahlungsschwelle von 50 Dollar unterschritten wird, wird der Betrag in die nächste Monatsabrechnung übernommen, da sonst die Gebühren im Verhältnis zum Betrag zu hoch wären.",
    },
    {
      q: "Wie kann ich meine Auszahlungsmethode ändern?",
      a: "Schreib uns dazu einfach eine Nachricht auf Telegram und lass uns deine neuen Details zukommen.",
    },
    {
      q: "Wie lange dauert es, bis Erfolge sichtbar sind?",
      a: "In der Regel dauert es zwei bis drei Monate, bis die Profile richtig anlaufen, da wir bei null starten. Wir nutzen kein Social Media, sondern arbeiten mit internen Traffic-Systemen. Der Aufbau dieser Systeme braucht anfangs Zeit, aber danach wird die Performance immer besser und vor allem konstanter.",
    },
    {
      q: "Was kann ich als Model tun, um mich zu verbessern?",
      a: "Besonders wichtig ist eine gute Erreichbarkeit. Zudem solltest du Custom-Anfragen zeitnah beantworten und vor allen Dingen regelmäßig neuen Content produzieren.",
    },
    {
      q: "Wie kann ich meine Umsätze steigern?",
      a: "Umsätze lassen sich durch eine hohe Frequenz an Content steigern. Halte dich dabei bitte genau an die Content-Instructions: Wichtig sind viele verschiedene Locations und Sets, die aufeinander aufbauen. Setze dabei auf authentischen Amateur-Content statt auf zu professionell wirkende Aufnahmen.",
    },
    {
      q: "Warum werden die Passwörter so oft geändert?",
      a: "Das geschieht aus Sicherheitsgründen. Da wir viele Mitarbeiter haben, wird bei jedem Personalwechsel das Passwort vorsorglich geändert. Die jeweils aktuellen Zugangsdaten kannst du dir aber jederzeit hier aus dem Dashboard kopieren.",
    },
  ],
  en: [
    {
      q: "How do I receive my payout?",
      a: "Payouts happen automatically every month within the first ten days. Just make sure the payment details you provided when signing the contract are still up to date. If the payout threshold of 50 dollars is not reached, the amount is carried over to the next monthly billing cycle, as otherwise the fees would be too high relative to the amount.",
    },
    {
      q: "How can I change my payout method?",
      a: "Simply send us a message on Telegram with your new details.",
    },
    {
      q: "How long does it take to see results?",
      a: "It usually takes two to three months for the profiles to really pick up, as we start from zero. We don't use social media; instead, we work with internal traffic systems. Building these systems takes time initially, but afterwards performance keeps getting better and, above all, more consistent.",
    },
    {
      q: "What can I do as a model to improve?",
      a: "Being easily reachable is especially important. You should also respond to custom requests promptly and, most importantly, produce new content regularly.",
    },
    {
      q: "How can I increase my revenue?",
      a: "Revenue can be increased by posting content frequently. Please follow the content instructions closely: many different locations and sets that build on each other are important. Focus on authentic amateur content rather than overly professional-looking footage.",
    },
    {
      q: "Why are passwords changed so often?",
      a: "This is done for security reasons. Since we have many staff members, passwords are changed preventively whenever there is a personnel change. However, you can always copy the current login credentials right here from the dashboard.",
    },
  ],
};

const TITLE: Record<"de" | "en", string> = {
  de: "Häufige Fragen",
  en: "Frequently Asked Questions",
};

const SUBTITLE: Record<"de" | "en", string> = {
  de: "Tippe auf eine Frage, um die Antwort zu sehen",
  en: "Tap a question to reveal the answer",
};

export default function ModelFaqSection({ language = "de" }: { language?: "de" | "en" }) {
  const lang = language === "en" ? "en" : "de";
  const [openId, setOpenId] = useState<string | null>(null);
  const items = FAQ_DATA[lang];

  return (
    <section
      className="relative overflow-hidden rounded-2xl p-5 space-y-4 card-inner-glow"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--card) / 0.85), hsl(var(--card) / 0.5))",
        border: "1px solid hsl(45 70% 55% / 0.2)",
        boxShadow:
          "0 0 0 1px hsl(45 70% 55% / 0.06) inset, 0 8px 32px -12px hsl(45 70% 50% / 0.25)",
      }}
    >
      {/* Decorative gold glow */}
      <div
        className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full blur-3xl opacity-40"
        style={{ background: "radial-gradient(circle, hsl(45 90% 60% / 0.5), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full blur-3xl opacity-30"
        style={{ background: "radial-gradient(circle, hsl(38 80% 55% / 0.4), transparent 70%)" }}
      />

      <div className="relative flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(135deg, hsl(45 90% 60% / 0.25), hsl(38 80% 50% / 0.1))",
            border: "1px solid hsl(45 80% 60% / 0.35)",
            boxShadow: "0 0 16px hsl(45 90% 55% / 0.25)",
          }}
        >
          <HelpCircle className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
            {TITLE[lang]}
            <Sparkles className="h-3.5 w-3.5 text-accent/70" />
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">{SUBTITLE[lang]}</p>
        </div>
      </div>

      <div className="relative space-y-2.5">
        {items.map((item, i) => {
          const id = `${lang}-${i}`;
          const isOpen = openId === id;
          return (
            <Collapsible key={id} open={isOpen} onOpenChange={(o) => setOpenId(o ? id : null)}>
              <div
                className={cn(
                  "group rounded-xl overflow-hidden transition-all duration-300",
                  isOpen && "shadow-[0_0_28px_-8px_hsl(45_90%_55%/0.35)]",
                )}
                style={{
                  background: isOpen
                    ? "linear-gradient(135deg, hsl(45 70% 50% / 0.12), hsl(38 60% 40% / 0.06))"
                    : "linear-gradient(135deg, hsl(var(--secondary) / 0.4), hsl(var(--secondary) / 0.2))",
                  border: isOpen
                    ? "1px solid hsl(45 85% 60% / 0.45)"
                    : "1px solid hsl(var(--border) / 0.35)",
                }}
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums transition-all duration-300",
                        isOpen ? "text-background" : "text-accent/80",
                      )}
                      style={{
                        background: isOpen
                          ? "linear-gradient(135deg, hsl(45 90% 65%), hsl(38 85% 50%))"
                          : "hsl(45 60% 50% / 0.12)",
                        border: isOpen
                          ? "1px solid hsl(45 90% 70%)"
                          : "1px solid hsl(45 60% 50% / 0.25)",
                        boxShadow: isOpen
                          ? "0 0 14px hsl(45 90% 60% / 0.55)"
                          : "none",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <span
                      className={cn(
                        "flex-1 text-sm font-medium transition-colors",
                        isOpen ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      {item.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-all duration-300",
                        isOpen ? "rotate-180 text-accent" : "text-muted-foreground",
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <div
                    className="mx-4 mb-4 mt-1 rounded-lg px-4 py-3.5 text-sm leading-relaxed text-foreground/85"
                    style={{
                      background:
                        "linear-gradient(135deg, hsl(45 50% 40% / 0.08), hsl(0 0% 100% / 0.02))",
                      borderLeft: "2px solid hsl(45 90% 60% / 0.7)",
                    }}
                  >
                    {item.a}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </section>
  );
}
