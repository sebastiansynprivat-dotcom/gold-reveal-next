import { useState, useMemo } from "react";
import { HelpCircle, Search, ExternalLink } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type FaqItem = {
  category: string;
  question: string;
  answer: string;
};

// Quelle: https://she-x.de/chatter-faq
const FAQ_ITEMS: FaqItem[] = [
  {
    category: "Allgemeines",
    question: "Was ist der Chatter-Job bei SheX?",
    answer:
      "Als Chatter bei SheX betreust du das Profil eines weiblichen Models auf Plattformen wie OnlyFans. Dein Hauptjob ist es, mit Fans zu schreiben, Vertrauen aufzubauen und sie dazu zu bringen, exklusive Inhalte zu kaufen. Damit verbringst du etwa 90 % deiner Zeit – und genau hier verdienst du auch den größten Teil deines Geldes. Die restlichen 10 % bestehen aus einfachen Aufgaben rund um den Content des Models: organisieren, teilweise bearbeiten und täglich posten. Vorkenntnisse brauchst du keine – wir zeigen dir alles Schritt für Schritt.",
  },
  {
    category: "Allgemeines",
    question: "Welche Hauptaufgaben hat ein Chatter?",
    answer:
      "1. Chat & Verkauf: Du schreibst intensiv und anonym mit den Fans und sorgst dafür, dass sie exklusive Inhalte kaufen – hier entsteht der Großteil deiner Einnahmen.\n2. Account-Management: Erstellen (ggf.), Aufbauen und Pflegen des Model-Accounts nach einer Schritt-für-Schritt-Anleitung.\n3. Content-Organisation: Du sortierst Bilder und Videos in Google-Drive-Ordnern, bearbeitest sie bei Bedarf leicht und planst sie fürs Posten und Verkaufen ein.\n4. Posten & Sichtbarkeit: Du veröffentlichst täglich Beiträge, damit das Profil sichtbar bleibt und neue Fans gewinnt.\n\nFalls Fragen oder Herausforderungen auftreten, stehen dir feste Ansprechpartner zur Verfügung.",
  },
  {
    category: "Allgemeines",
    question: "In welcher Sprache wird der Chat geführt?",
    answer:
      "Der Chat findet ausschließlich auf Deutsch statt. Du brauchst also keine Fremdsprachenkenntnisse. Wenn du fließend Englisch schreiben kannst, sag uns im Onboarding gern Bescheid – es gibt auch Accounts, bei denen beide Sprachen gebraucht werden.",
  },
  {
    category: "Allgemeines",
    question: "Welche Chatter sind bei uns am erfolgreichsten?",
    answer:
      "Der Erfolg eines Chatters hängt vor allem von Aktivität, Engagement und den richtigen Soft Skills ab. Wer regelmäßig aktiv ist, mit Fleiß arbeitet und gute Kommunikationsfähigkeiten mitbringt, erzielt in der Regel die besten Ergebnisse. Zusätzlich helfen Checklisten, Anleitungen und Videoerklärungen aus dem Gruppenchat.",
  },
  {
    category: "Allgemeines",
    question: "Welche Plattformen werden genutzt?",
    answer:
      "Als Chatter arbeitest du entweder auf OnlyFans, 4based oder MALOUM – aber immer nur auf einer dieser Plattformen. Sie sind mit OnlyFans vergleichbar, haben aber zusätzliche Vorteile, die du in der Einarbeitung kennenlernst.",
  },
  {
    category: "Allgemeines",
    question: "Welche technischen Voraussetzungen gibt es?",
    answer:
      "Du brauchst nur ein Smartphone oder einen Laptop und eine stabile Internetverbindung. Keine besondere Technik oder Software – dein normales Gerät reicht völlig aus.",
  },
  {
    category: "Allgemeines",
    question: "Bleiben meine persönlichen Daten anonym?",
    answer:
      "Ja. Deine Daten werden zu keiner Zeit veröffentlicht oder an Dritte weitergegeben. Nur unser internes Team hat Zugriff darauf – und auch nur, wenn es für die Arbeit wirklich notwendig ist. Wir halten uns dabei strikt an die DSGVO.",
  },
  {
    category: "Allgemeines",
    question: "Bekomme ich Post nach Hause?",
    answer:
      "Nein – du bekommst von uns keine Post nach Hause. Alle Infos, Abrechnungen und Dokumente erhältst du digital über E-Mail oder den WhatsApp-Gruppenchat. So bleibt alles diskret und papierlos.",
  },
  {
    category: "Arbeitszeit",
    question:
      "Muss ich etwas tun, wenn ich krank bin oder aus anderen Gründen nicht aktiv sein kann?",
    answer:
      "Ja – bitte gib uns kurz Bescheid, wenn du länger als 24 Stunden nicht aktiv sein kannst (Krankheit, Urlaub, persönliche Gründe). So können wir entsprechend planen und deinen Account bestmöglich alternativ besetzen.",
  },
  {
    category: "Allgemeines",
    question: "Habe ich feste Ansprechpartner?",
    answer:
      "Ja, unser Team steht dir fast rund um die Uhr bei Fragen zur Verfügung – über den Gruppenchat und deine festen Ansprechpartner.",
  },
  {
    category: "Account-Management",
    question: "Muss man sich die Models selbst suchen?",
    answer:
      "Nein – du musst dir keine Models selbst suchen. Du bekommst deinen Model-Account samt Content direkt von uns zugeteilt. So kannst du dich voll auf deine Aufgaben konzentrieren.",
  },
  {
    category: "Karriere",
    question: "Kann ich bei SheX Karriere machen?",
    answer:
      "Ja. Wenn du motiviert bist und dich reinhängst, kannst du von Anfang an gutes Geld verdienen und dich weiterentwickeln. Je mehr du leistest, desto mehr Verantwortung kannst du übernehmen – z. B. mehr Accounts, größere Accounts oder spannende Langzeit-Projekte.",
  },
  {
    category: "Empfehlung",
    question: "Wie empfehle ich die Tätigkeit als Chatter weiter?",
    answer:
      "Schicke deinen Freund:innen oder Bekannten einfach diesen Link – darüber können sie sich direkt bewerben: https://www.she-x.de/dein-chatter-job. Sie werden genauso sorgfältig betreut wie du.",
  },
  {
    category: "Empfehlung",
    question: "Wie empfehle ich SheX an eine Creatorin weiter?",
    answer:
      "Wenn du eine Creatorin kennst, für die unsere Agentur interessant sein könnte, markiere einfach @Marvin in der Gruppe und sag kurz Bescheid, dass du sie empfehlen möchtest. Sie bekommt die gleiche individuelle Betreuung wie du.",
  },
  {
    category: "Feedback",
    question: "Wo kann ich anonym Feedback zur Zusammenarbeit geben?",
    answer:
      "Du kannst jederzeit anonym Feedback geben – egal ob Lob, Kritik oder Verbesserungsvorschläge. Nutze dazu diesen Link aus deiner Gruppenbeschreibung: https://app.youform.com/forms/comrdljm. Wir können zu keiner Zeit nachverfolgen, wer du bist. Alles bleibt 100 % anonym.",
  },
];

const FAQ_URL = "https://she-x.de/chatter-faq";

function renderAnswer(text: string) {
  // Auto-link URLs
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <div className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 hover:brightness-125 break-all"
          >
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  );
}

export default function ChatterFaqWidget() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (i) =>
        i.question.toLowerCase().includes(q) ||
        i.answer.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="glass-card-subtle rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">Häufige Fragen (FAQ)</span>
        </div>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[10px] text-muted-foreground hover:text-accent"
        >
          <a href={FAQ_URL} target="_blank" rel="noopener noreferrer">
            Alle FAQs <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Frage suchen…"
          className="h-8 pl-8 text-xs bg-background/40"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Keine passende Frage gefunden.
        </p>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {filtered.map((item, idx) => (
            <AccordionItem
              key={idx}
              value={`faq-${idx}`}
              className="border-border/60"
            >
              <AccordionTrigger className="py-2.5 text-left text-xs font-medium hover:no-underline">
                <div className="flex flex-col items-start gap-1 pr-2">
                  <span className="text-[9px] uppercase tracking-wide text-accent/80">
                    {item.category}
                  </span>
                  <span className="text-foreground">{item.question}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">{renderAnswer(item.answer)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <p className="text-[10px] text-muted-foreground text-center pt-1">
        Weitere Antworten findest du im{" "}
        <a
          href={FAQ_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-2"
        >
          vollständigen FAQ
        </a>
        .
      </p>
    </div>
  );
}
