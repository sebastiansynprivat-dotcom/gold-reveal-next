import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
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

interface Props {
  language?: "de" | "en";
}

export default function ModelFaqSection({ language = "de" }: Props) {
  const lang = language === "en" ? "en" : "de";
  const [openId, setOpenId] = useState<string | null>(null);
  const items = FAQ_DATA[lang];

  return (
    <section className="glass-card rounded-2xl p-5 space-y-4 card-inner-glow">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-accent" />
        <h2 className="text-base font-bold text-foreground">{TITLE[lang]}</h2>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => {
          const id = `${lang}-${i}`;
          const isOpen = openId === id;
          return (
            <Collapsible key={id} open={isOpen} onOpenChange={(open) => setOpenId(open ? id : null)}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all",
                    isOpen
                      ? "border-accent/40 bg-accent/10 text-foreground"
                      : "border-border/30 bg-secondary/20 text-muted-foreground hover:text-foreground hover:border-accent/20",
                  )}
                >
                  <span className="flex-1">{item.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="px-4 pb-3 pt-1 text-muted-foreground leading-relaxed">
                  {item.a}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </section>
  );
}
