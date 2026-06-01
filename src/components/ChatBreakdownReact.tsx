// Structured React rendition of the chat-breakdown PDF.
// Used for English (and other future-translated) viewers so the
// AutoTranslator can render the entire breakdown in the user's language.
// German users keep the original styled JPGs.

import { motion } from "framer-motion";

type Msg = {
  side: "k" | "m"; // customer | model
  text?: string;
  time: string;
  bought?: boolean;
  media?: { label: string; price?: string };
};

type Phase = {
  num: number;
  title: string;
  kicker: string;
  messages: Msg[];
  // Insert explanation boxes after a given message index (inclusive). Multiple per phase OK.
  boxes: { afterIdx: number; title: string; body: string }[];
};

const HEADER = {
  kicker: "SHEX COACHING · CHAT-ANALYSE",
  title1: "Vom ersten Hallo",
  title2: "zum 115 €-Abschluss.",
  sub: "Ein echter Chatverlauf – Nachricht für Nachricht erklärt. Mit der Preisleiter aus dem SheX-Coaching: 5 → 10 → 20 → 30 → 50 €.",
  meta: [
    { label: "SZENARIO", value: "Neuer Kunde" },
    { label: "DAUER", value: "ca. 45 Min." },
    { label: "UMSATZ", value: "115 € / 5 Verkäufe" },
    { label: "STUFE", value: "Einsteiger" },
  ],
  legend: "So liest du dieses PDF: Kunde links (grau), Model rechts (gold). In den goldenen Boxen erklären wir dir Schritt für Schritt, warum genau dieser Satz verkauft.",
};

const PHASES: Phase[] = [
  {
    num: 1,
    title: "Kennenlernen – das Eis brechen",
    kicker: "Noch keine Anspielungen. Erst Mensch sein. Ziel: er fühlt sich wirklich gesehen.",
    messages: [
      { side: "m", text: "hey :)", time: "21:04" },
      { side: "m", text: "danke fürs abo, schatz! wie heißt du eigentlich?", time: "21:04" },
      { side: "k", text: "hi, ich bin mike. dein profil ist echt der hammer", time: "21:06" },
      { side: "m", text: "awww mike :) was hat dich heute zu mir geführt? schwerer tag gewesen?", time: "21:06" },
      { side: "k", text: "ja, kann man so sagen. lange schicht im lager", time: "21:08" },
      { side: "m", text: "ohh du Armer. ich mach dir den abend besser, versprochen", time: "21:09" },
      { side: "m", text: "wenn du mich brav machen lässt … was magst du an frauen eigentlich am meisten?", time: "21:09" },
      { side: "k", text: "ehrlich? die augen. und wenn sie wissen, was sie wollen", time: "21:11" },
    ],
    boxes: [
      {
        afterIdx: 4,
        title: "Persönliche Frage statt sofort zu verkaufen",
        body: "Statt direkt ein Bild zu schicken, stellt das Model eine offene Frage zu seinem Tag. Das hat zwei Effekte: (1) Er fühlt sich als Mensch wahrgenommen – nicht als Geldbeutel. (2) Du sammelst Informationen ('Lager, lange Schicht'), die du später nutzt, um seine Fantasie gezielt zu wecken. Die ersten 10 bis 20 Nachrichten sind reine Vorarbeit. Hier wird noch nichts verkauft – hier wird zugehört.",
      },
      {
        afterIdx: 7,
        title: "Das erste kleine Ja – fast unsichtbar",
        body: "'Wenn du mich brav machen lässt' ist noch kein Verkauf, sondern ein Test. Er akzeptiert ganz nebenbei, dass sie die Führung übernimmt. Genau das ist Sebastians Grundregel: du führst, der Kunde folgt. Jede kleine Zustimmung – 'klar', 'zeig mal', 'ja' – macht die spätere Kaufentscheidung deutlich leichter. Profis bauen diese Kette ganz bewusst auf, bevor zum ersten Mal ein Preis fällt.",
      },
    ],
  },
  {
    num: 2,
    title: "Überleitung – vom Smalltalk in den Verkauf",
    kicker: "Sauber aus dem Plaudern in die Spannung wechseln. Das erste Bild ist gratis – aber mit Aufbau.",
    messages: [
      { side: "m", text: "okay du … ich hab gerade ein bild gemacht, weiß aber nicht, ob ich es posten soll, haha", time: "21:14" },
      { side: "k", text: "zeig her, sofort!!", time: "21:14" },
      { side: "m", text: "hmmm okay … aber nur weil du es bist", time: "21:15" },
      { side: "m", media: { label: "Gratis-Vorschau · Spiegel-Selfie", price: "GRATIS" }, time: "21:15" },
      { side: "k", text: "krass. das musst du posten. oder noch besser: nur an mich", time: "21:16" },
      { side: "m", text: "hä … findest du mich da echt heiß?", time: "21:16" },
      { side: "k", text: "100 prozent. zeig mir mehr, bitte", time: "21:17" },
    ],
    boxes: [
      {
        afterIdx: 3,
        title: "'Soll ich, soll ich nicht?' – die Neugier-Bremse",
        body: "Dieser eine Satz erledigt drei Dinge gleichzeitig: (1) Er muss wissen, was sie da gemacht hat – die Spannung ist sofort im Raum. (2) Sie wirkt unsicher und schüchtern, nicht wie eine Verkäuferin. (3) Sie zwingt ihn zum 'Ja' – er bettelt selbst darum, das Bild sehen zu dürfen. Erst danach kommt das Foto. Sie verkauft also die Erlaubnis zu schauen, bevor sie überhaupt etwas zeigt. Genau das meint Sebastian mit 'sauber aus dem Smalltalk in den Verkauf wechseln' – auch die Vorlagen rund um 'neue Unterwäsche', 'Banane' oder 'aus der Dusche' funktionieren nach demselben Muster.",
      },
      {
        afterIdx: 6,
        title: "Komplimente zurückspiegeln und verstärken lassen",
        body: "'Findest du mich da echt heiß?' ist kein Schmeicheln. Sie zwingt ihn, sein Kompliment zu wiederholen und stärker zu formulieren. Jedes Mal, wenn er 'ja, du bist heiß' tippt, investiert er emotional mehr in den Chat. Je mehr Zeit, Komplimente und Aufmerksamkeit er bereits gegeben hat, desto schwerer fällt es ihm später, beim Preis abzuspringen. Sebastian nennt das: den Kunden aufwärmen, bevor du verkaufst.",
      },
    ],
  },
  {
    num: 3,
    title: "Die ersten Stufen – 5 € und 10 €",
    kicker: "Sebastians Preisleiter startet immer klein. 5 € fühlen sich nach nichts an – der erste Kauf ist der wichtigste.",
    messages: [
      { side: "m", text: "okay, ich könnt dir was schicken … aber du musst mir vorher was versprechen", time: "21:19" },
      { side: "k", text: "alles", time: "21:19" },
      { side: "m", text: "nicht teilen, ja? ich hab das noch keinem geschickt und will nicht, dass das rumgeht", time: "21:20" },
      { side: "k", text: "schwöre. nur für mich", time: "21:20" },
      { side: "m", text: "okk, gib mir 1 sekunde, ich mach das schnell für dich ;)", time: "21:21" },
      { side: "m", media: { label: "Oberteil aus · 30 Sek.", price: "5 €" }, time: "21:21" },
      { side: "k", text: "wahnsinn. mehr. bitte", time: "21:23", bought: true },
      { side: "m", text: "guck nicht so, du machst mich ganz nervös", time: "21:23" },
      { side: "k", text: "ich kann nicht anders … was hast du noch?", time: "21:24" },
      { side: "m", text: "hmmm … wenn du willst, zieh ich mehr aus. aber ich brauch dich richtig heiß für mich", time: "21:24" },
      { side: "m", media: { label: "Unterwäsche · 1:10 Min.", price: "10 €" }, time: "21:24" },
    ],
    boxes: [
      {
        afterIdx: 5,
        title: "Sebastians 5-€-Regel: immer klein anfangen",
        body: "Im Coaching ist Sebastian eindeutig: nie nackt zum Einstieg. Das erste kostenpflichtige Bild liegt bei 5 € – maximal Unterwäsche oder ein verdeckter Körper. Drei Hebel wirken hier gleichzeitig: Exklusivität ('noch keinem geschickt') hebt den gefühlten Wert. Vertrauen ('du musst mir was versprechen') macht aus dem Kauf eine emotionale Verpflichtung, keine Transaktion. Das Gefühl, dass es jetzt passiert ('gib mir 1 Sekunde') erzeugt die Illusion, das Video werde gerade in diesem Moment für ihn aufgenommen.",
      },
      {
        afterIdx: 10,
        title: "Nach dem Kauf nie schweigen",
        body: "Der häufigste Anfängerfehler: Verkauf läuft → Pause → Chat ist tot. Profis schicken sofort die nächste Nachricht in der Rolle hinterher ('guck nicht so …'). Das hält ihn in der Stimmung und öffnet die Tür für den nächsten Verkauf. Sebastians Regel: zwischen jedem Verkauf erst wieder Emotion aufbauen – und dann erst den nächsten Preis nennen. Niemals zwei Preise direkt hintereinander.",
      },
    ],
  },
  {
    num: 4,
    title: "Aufbauen – 20 €, 30 €, 50 €",
    kicker: "Der Preis steigt mit der Erregung. Jeder neue Verkauf ist die logische Fortsetzung seiner Fantasie.",
    messages: [
      { side: "m", text: "stell dir vor, wir würden kuscheln und ich hätte nur das an … wo wären deine hände?", time: "21:25" },
      { side: "k", text: "überall. erst auf dem bauch, dann tiefer", time: "21:26" },
      { side: "m", text: "mmh ja. ich werd grad echt nass, weil du das sagst", time: "21:26" },
      { side: "m", text: "willst du sehen?", time: "21:27" },
      { side: "k", text: "ja, zeig", time: "21:27" },
      { side: "m", media: { label: "Solo · Bauch & tiefer · 2:14", price: "20 €" }, time: "21:27" },
      { side: "k", text: "ich bin grad so hart", time: "21:30", bought: true },
      { side: "m", text: "zeig mir", time: "21:30" },
      { side: "k", text: "[bild]", time: "21:31" },
      { side: "m", text: "verdammt, mike. der ist perfekt. ich will da drauf kommen – darf ich?", time: "21:32" },
      { side: "k", text: "ja. mach", time: "21:32" },
      { side: "m", media: { label: "Aus deiner Sicht · 1:48 Min.", price: "30 €" }, time: "21:32" },
      { side: "m", text: "warte, nicht kommen … ich will mit dir zusammen", time: "21:34" },
      { side: "m", text: "noch ein letztes für uns beide?", time: "21:34" },
      { side: "k", text: "ja, bitte. zeig mir alles", time: "21:35" },
      { side: "m", media: { label: "Finale · zusammen kommen · 2:30", price: "50 €" }, time: "21:35" },
    ],
    boxes: [
      {
        afterIdx: 5,
        title: "Er beschreibt – sie verkauft ihm genau das",
        body: "Achte auf den Trick: er sagt 'erst auf dem Bauch, dann tiefer'. Sie verkauft ihm anschließend ein Video, das genau das zeigt. Er kauft also nicht irgendein Video – er kauft die Bestätigung seiner eigenen Fantasie. Genau darum geht es Sebastian, wenn er sagt: 'die Fantasie des Kunden wecken und ihm dann liefern, was er gerade selbst beschrieben hat'. Hier knackt die Kaufquote regelmäßig die 80 %.",
      },
      {
        afterIdx: 11,
        title: "'Darf ich?' – Erlaubnis statt Preisfrage",
        body: "Statt zu fragen 'willst du das Video für 30 €?' bittet sie um Erlaubnis. Das dreht das Spiel komplett: er denkt, er entscheidet. In Wahrheit hat sie ihn in eine Situation gebracht, in der ein 'Nein' bedeuten würde, sie zu enttäuschen. Ein klares 'Nein' auf eine direkte Preisfrage ist leicht. Ein 'Nein' auf ein 'darf ich …' fühlt sich an wie Ablehnung – und das macht kein Mann mitten in der Erregung.",
      },
      {
        afterIdx: 15,
        title: "Hinhalten ist alles – Sebastians wichtigste Regel",
        body: "Sebastian sagt es im Coaching ganz klar: lass den Kunden niemals kommen, bevor du maximal verkauft hast. Nach dem Orgasmus kauft kein Mann mehr. 'Nein, warte, ich will mit dir zusammen kommen' ist der goldene Satz, der ihn auf der höchsten Preisstufe hält – und gleichzeitig den größten Verkauf der Session möglich macht.",
      },
    ],
  },
  {
    num: 5,
    title: "Sauberer Abschluss – damit er morgen wiederkommt",
    kicker: "Der wichtigste Schritt kommt NACH dem letzten Kauf. Hier entscheidet sich, ob er morgen wieder zahlt.",
    messages: [
      { side: "k", text: "bestes geld, das ich je ausgegeben hab", time: "21:36", bought: true },
      { side: "m", text: "warte … ich hab noch was für dich. nur für dich, gratis", time: "21:37" },
      { side: "m", media: { label: "Gratis-Selfie · Dankeschön", price: "GRATIS" }, time: "21:37" },
      { side: "m", text: "du warst heute so süß zu mir. wann schreibst du mir wieder?", time: "21:38" },
      { side: "k", text: "morgen, gleich nach der schicht", time: "21:38" },
    ],
    boxes: [
      {
        afterIdx: 4,
        title: "Sebastians wichtigster Schritt: das Gratis-Selfie zum Schluss",
        body: "Sebastian wiederholt es im Coaching immer wieder: nach dem letzten Verkauf kommt ein liebes Wort und ein kostenloses Selfie ('Bis morgen, Süßer'). 99 % aller Chatter verschwinden, sobald das Geld da ist. Profis machen genau das Gegenteil. Der Effekt: er fühlt sich nicht ausgenutzt, sondern belohnt. Diese eine kleine Geste kostet nichts – und verwandelt einen einmaligen 115-€-Kunden in einen Stammkunden, der jeden Tag wiederkommt. Genau da liegt das echte Geld, sagt Sebastian: nicht im einmaligen 400-€-Kauf, sondern in dem Kunden, der zehnmal 400 € ausgibt.",
      },
    ],
  },
];

function Bubble({ msg }: { msg: Msg }) {
  const isModel = msg.side === "m";
  return (
    <div className={`flex ${isModel ? "justify-end" : "justify-start"} items-end gap-2 my-1.5`}>
      {!isModel && (
        <div className="w-7 h-7 rounded-full bg-secondary/70 border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">K</div>
      )}
      <div className={`max-w-[78%] flex flex-col ${isModel ? "items-end" : "items-start"}`}>
        {msg.media ? (
          <div className="rounded-2xl overflow-hidden border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-yellow-600/5 px-4 py-3 min-w-[180px]">
            <div className="text-[11px] uppercase tracking-wider text-amber-300/80 mb-1">{msg.media.label}</div>
            <div className="text-lg font-extrabold text-gold-gradient">{msg.media.price}</div>
          </div>
        ) : (
          <div
            className={`rounded-2xl px-3.5 py-2 text-sm leading-snug ${
              isModel
                ? "bg-gradient-to-br from-amber-400 to-amber-500 text-black font-medium rounded-br-md"
                : "bg-secondary/60 text-foreground border border-border/60 rounded-bl-md"
            }`}
          >
            {msg.text}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground mt-0.5 px-1 flex items-center gap-1.5">
          <span>{msg.time}</span>
          {msg.bought && (
            <span className="text-emerald-400 font-bold">· gekauft</span>
          )}
        </div>
      </div>
      {isModel && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[10px] font-bold text-black shrink-0">M</div>
      )}
    </div>
  );
}

function ExplainBox({ title, body }: { title: string; body: string }) {
  return (
    <div className="my-4 rounded-xl border-l-4 border-amber-400 bg-amber-500/[0.06] p-4">
      <div className="text-[10px] uppercase tracking-widest font-bold text-amber-300 mb-1">Warum das funktioniert</div>
      <div className="text-base font-bold text-foreground mb-2">{title}</div>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

export default function ChatBreakdownReact() {
  return (
    <div className="space-y-8">
      {/* Cover / intro */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.07] to-transparent p-6 sm:p-8 shadow-[0_0_40px_rgba(212,175,55,0.15)]"
      >
        <div className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80 font-bold mb-3">{HEADER.kicker}</div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
          {HEADER.title1}<br />
          <span className="text-gold-gradient">{HEADER.title2}</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-snug">{HEADER.sub}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {HEADER.meta.map((m) => (
            <div key={m.label} className="rounded-xl bg-secondary/40 border border-border/60 p-3">
              <div className="text-[10px] uppercase tracking-widest text-amber-300/80 font-bold">{m.label}</div>
              <div className="text-sm font-bold text-foreground mt-1">{m.value}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-5 italic">{HEADER.legend}</p>
      </motion.section>

      {/* Phases */}
      {PHASES.map((phase) => (
        <motion.section
          key={phase.num}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-border/60 bg-secondary/20 p-5 sm:p-7"
        >
          <div className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80 font-bold">
            Phase {phase.num} / {PHASES.length}
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 leading-tight">{phase.title}</h3>
          <p className="text-sm text-muted-foreground mt-2">{phase.kicker}</p>

          <div className="mt-5">
            {phase.messages.map((m, i) => {
              const boxAfter = phase.boxes.find((b) => b.afterIdx === i);
              return (
                <div key={i}>
                  <Bubble msg={m} />
                  {boxAfter && <ExplainBox title={boxAfter.title} body={boxAfter.body} />}
                </div>
              );
            })}
          </div>
        </motion.section>
      ))}
    </div>
  );
}
