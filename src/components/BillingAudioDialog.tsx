import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";
import GoldenAudioPlayer from "@/components/GoldenAudioPlayer";

const reviews = [
  { name: "Mark", date: "Jan 2026", title: "Sehr positiver Einstieg und tolles Arbeitsumfeld", text: "Ich wurde von Anfang an sehr herzlich aufgenommen und umfassend eingearbeitet. Der Einstieg verlief reibungslos. Das gesamte Team ist ausgesprochen freundlich, hilfsbereit und gut organisiert. Auch die Bezahlung verläuft zuverlässig und problemlos.", stars: 5 },
  { name: "Michaela", date: "Jan 2026", title: "Seit über einem Jahr zu 100% Zufrieden", text: "Wer bereit ist zu arbeiten hat hier einen zuverlässigen, freundlichen und kompetenten Partner. Das Geld kommt super pünktlich und immer korrekt abgerechnet. Ich bin jedenfalls froh, etwas gefunden zu haben, wo ich jederzeit und von überall mir ein gutes Zubrot verdienen kann 😃", stars: 5 },
  { name: "Nikolett T.", date: "Jan 2026", title: "Super Team", text: "Die Einarbeitung ging schnell und unkompliziert. Die Unterstützung ist mehr als gut, man kann jederzeit Fragen stellen. Man bleibt komplett anonym und kann von überall aus arbeiten. Ich kann sie nur weiterempfehlen. ☺️", stars: 5 },
  { name: "Mika O.", date: "Jan 2026", title: "Sehr guter Arbeitgeber", text: "Zuverlässig, fair und professionell. Kann ich nur weiterempfehlen.", stars: 5 },
  { name: "Laura K.", date: "Feb 2026", title: "Flexibel und fair", text: "Ich kann mir meine Zeit komplett frei einteilen und arbeite wann ich will. Die Auszahlungen kommen immer pünktlich und es gibt nie Stress. Genau das, was ich gesucht habe.", stars: 5 },
  { name: "Jonas B.", date: "Feb 2026", title: "Besser als erwartet", text: "Hatte am Anfang meine Zweifel, aber nach dem ersten Monat war ich überzeugt. Die Einarbeitung war top, das Team hilft einem wirklich weiter und man merkt, dass hier alles professionell läuft.", stars: 5 },
  { name: "Sophie M.", date: "Jan 2026", title: "Endlich ein seriöser Nebenjob", text: "Ich habe vorher einiges ausprobiert und bin immer wieder enttäuscht worden. Hier stimmt einfach alles – die Kommunikation, die Bezahlung und der Umgang miteinander. Bin echt froh, dass ich es probiert habe.", stars: 5 },
  { name: "Daniel W.", date: "Dez 2025", title: "Hammer Support", text: "Egal wann ich eine Frage hatte, es kam immer innerhalb von Minuten eine Antwort. So einen Support habe ich noch nie erlebt. Man fühlt sich wirklich gut aufgehoben.", stars: 5 },
  { name: "Anna-Lena R.", date: "Feb 2026", title: "Ideal neben dem Studium", text: "Ich studiere Vollzeit und brauche was Flexibles. Hier kann ich abends oder am Wochenende arbeiten, ohne dass jemand Druck macht. Die Kohle kommt trotzdem zuverlässig. Perfekt für mich.", stars: 5 },
  { name: "Tim S.", date: "Jan 2026", title: "Transparente Abrechnung", text: "Was mich am meisten überzeugt hat: Man sieht genau, was man verdient hat und es stimmt immer. Keine versteckten Abzüge, keine Überraschungen. Einfach ehrlich.", stars: 5 },
  { name: "Jasmin H.", date: "Feb 2026", title: "Tolles Arbeitsklima trotz Remote", text: "Obwohl man von zuhause arbeitet, fühlt man sich nicht allein. Das Team ist immer erreichbar und es gibt regelmäßig Updates. Man hat echt das Gefühl, dazuzugehören.", stars: 5 },
  { name: "Patrick L.", date: "Dez 2025", title: "Schneller Einstieg, gutes Geld", text: "Innerhalb von zwei Tagen war ich startklar. Die Schulung war kurz und knackig, und ab Tag 3 habe ich schon verdient. Hätte nicht gedacht, dass das so schnell geht.", stars: 5 },
  { name: "Lena F.", date: "Jan 2026", title: "Man merkt, dass die sich kümmern", text: "Es ist nicht einfach nur ein Job – man spürt, dass dem Team wirklich was an einem liegt. Bei Problemen wird sofort geholfen und man bekommt ehrliches Feedback. Das ist selten.", stars: 5 },
  { name: "Marco D.", date: "Feb 2026", title: "Kein Vergleich zu anderen Agenturen", text: "Ich war vorher bei zwei anderen Agenturen und der Unterschied ist wie Tag und Nacht. Hier wird man respektiert, fair bezahlt und bekommt echte Unterstützung statt leerer Versprechen.", stars: 5 },
  { name: "Sandra P.", date: "Jan 2026", title: "Verdiene mehr als in meinem alten Nebenjob", text: "Ich habe vorher in der Gastro gejobbt und dort deutlich weniger verdient bei viel mehr Stress. Hier bestimme ich mein Tempo und verdiene trotzdem besser. Klare Empfehlung.", stars: 5 },
  { name: "Nico V.", date: "Feb 2026", title: "Läuft einfach", text: "Keine komplizierten Prozesse, kein unnötiger Papierkram. Anmelden, einarbeiten lassen, loslegen. So sollte es überall sein.", stars: 4 },
  { name: "Christina G.", date: "Dez 2025", title: "Pünktliche Zahlung, immer", text: "In sechs Monaten gab es nicht ein einziges Mal eine Verzögerung bei der Auszahlung. Das gibt einem Sicherheit und Vertrauen. Bin sehr zufrieden.", stars: 5 },
  { name: "Felix A.", date: "Jan 2026", title: "Cooles Konzept", text: "Ich finde das gesamte Konzept richtig gut durchdacht. Man hat alle Tools, die man braucht, die Kommunikation läuft smooth und man kann sich voll auf die Arbeit konzentrieren.", stars: 5 },
  { name: "Melina T.", date: "Feb 2026", title: "Empfehlung an alle Mamas", text: "Als alleinerziehende Mutter brauche ich maximale Flexibilität. Hier kann ich arbeiten, wenn die Kinder schlafen, und trotzdem gutes Geld verdienen. Bin so dankbar dafür. ❤️", stars: 5 },
  { name: "Kevin J.", date: "Jan 2026", title: "Ehrlich und direkt", text: "Hier wird einem nichts vorgemacht. Man weiß von Anfang an, was einen erwartet, und genau so läuft es dann auch. Keine falschen Versprechungen, einfach solide Arbeit.", stars: 5 },
  { name: "Elena S.", date: "Feb 2026", title: "Hab schon Freundinnen geworben", text: "Ich bin so zufrieden, dass ich schon drei Freundinnen überzeugt habe, auch anzufangen. Alle sind genauso begeistert wie ich. Das spricht doch für sich.", stars: 5 },
  { name: "Tobias R.", date: "Dez 2025", title: "Stabiles Einkommen von zuhause", text: "Ich wollte mir was dazuverdienen, ohne das Haus verlassen zu müssen. Genau das habe ich hier gefunden. Stabiler Verdienst, nettes Team, null Stress.", stars: 5 },
  { name: "Julia W.", date: "Feb 2026", title: "Die Einarbeitung war gold wert", text: "Am Anfang wusste ich nicht so recht, was auf mich zukommt. Aber die Einarbeitung hat mir alles Schritt für Schritt erklärt. Danach lief es wie von selbst.", stars: 5 },
  { name: "Alex M.", date: "Jan 2026", title: "Vertrauenswürdige Agentur", text: "Nach vielen schlechten Erfahrungen online war ich skeptisch. Aber hier passt alles: seriöse Kommunikation, klare Regeln und die Bezahlung stimmt. Endlich was Vernünftiges.", stars: 5 },
];

export default function BillingAudioDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors">
          <HelpCircle className="h-3 w-3" />
          Warum dauert das so lange?
        </button>
      </DialogTrigger>
      <DialogContent className="glass-card border-accent/20 sm:max-w-xl max-h-[85vh] overflow-y-auto shadow-[0_0_30px_-5px_hsl(var(--accent)/0.15),0_0_60px_-10px_hsl(var(--accent)/0.08)]">
        <DialogHeader className="pr-6">
          <DialogTitle className="text-foreground text-sm">Warum dauert das so lange?</DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">Hier erkläre ich es dir kurz per Sprachmemo.</DialogDescription>
        </DialogHeader>
        <GoldenAudioPlayer src="/audio/billing-info.mp3" />
        <div className="space-y-3 pt-2">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Was andere sagen</p>
          {reviews.map((review, i) => (
            <div key={i} className="glass-card-subtle rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground">{review.name.split(" ").map(n => n[0]).join("").toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{review.name}</p>
                  <p className="text-[10px] text-muted-foreground">DE · {review.date}</p>
                </div>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: review.stars }).map((_, s) => (
                  <div key={s} className="h-5 w-5 bg-[#00b67a] flex items-center justify-center">
                    <span className="text-[11px] text-white leading-none">★</span>
                  </div>
                ))}
              </div>
              <p className="text-xs font-bold text-foreground">{review.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{review.text}</p>
            </div>
          ))}
          <a
            href="https://www.trustpilot.com/review/she-x.de?languages=all"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90 transition-colors"
          >
            Mehr Bewertungen lesen
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
