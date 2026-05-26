# Plan: Premium "Beispielchat"-PDFs für Inspirations-Bibliothek

## Ziel
Echte, lehrreiche Chatverläufe (Model rechts / Kunde links) als Premium-PDFs erstellen, in denen nach jedem wichtigen Move erklärt wird **warum** dieser Move funktioniert hat – direkt aus Sebastians Coaching-Wissen abgeleitet. Diese PDFs ersetzen dann die Platzhalter in der `InspirationLibrary` auf dem Dashboard.

## Vorgehen (3 Schritte, iterativ)

### 1. Inhalt schreiben (Quelle: Coaching-Transkript + Web-Research)
Wir nutzen primär das, was bereits in `docs/coaching/chatter-training-transcript.md` steht – v.a. den **Julian-Chat (~400 $)** als Master-Vorlage. Zusätzlich recherchiere ich öffentlich verfügbare OnlyFans-Chatter-Skripte / Sexting-Sales-Beispiele (englischsprachige Chatter-Communities, Reddit r/onlyfansadvice, Agency-Blogs) als Inspiration für Mechaniken – nicht zum Kopieren, sondern um realistische Dialogbeispiele zu bauen, die exakt auf SheX-Methodik (A/B, Preisleiter 5→10→20→30→50→100, Emotion statt Content, sauberer Abschluss) gemappt sind.

**3 PDFs als Start:**
1. **"Der erste Verkauf – A oder B in 20 Nachrichten"** (kalter Chat → erstes 5€-Bild)
2. **"Die Preisleiter – Von 5€ auf 100€ in einem Chat"** (kompletter Julian-Style Sales-Run)
3. **"Der Wiederkäufer – So machst du aus 1× 400€ einen 10× 400€ Kunden"** (Tag 2 Follow-up)

Jede PDF: 8–12 Seiten, ~15–25 Chat-Bubbles + Coach-Kommentar-Boxen ("Warum funktioniert das?") nach jedem Schlüssel-Move.

### 2. PDF technisch generieren
Lokales Python-Skript mit **ReportLab** (bereits im Skill-Set, kein User-API-Key nötig). Generiert in `/mnt/documents/inspiration/`:
- iMessage-ähnliche Bubbles (Kunde: graue Bubble links / Model: gold-gradient Bubble rechts mit dunklem Text)
- SheX-Branding: Schwarzer Hintergrund, Gold-Akzente (#D4AF37), Inter/Sans-Serif
- Coach-Kommentar-Boxen: gold-umrandete Kästen mit "💡 Warum das funktioniert" + Erklärung
- Cover-Seite mit Titel, "by Sebastian / SheX", Zähler ("PDF 1 von 3")
- Footer mit Seitenzahl
- Visuelle QA nach Generierung (pdftoppm → Bilder prüfen)

### 3. Im Dashboard einbinden
- PDFs nach `public/inspiration/` kopieren (statisch ausgeliefert)
- `InspirationLibrary.tsx`: Platzhalter-Karten ersetzen durch echte PDFs mit Download/Open-in-new-Tab (statt Toast). Titel, Untertitel, geschätzte Lesezeit, "PDF" Badge.
- Klick öffnet PDF in neuem Tab; `playSound("click")` bleibt.
- Kein Backend nötig (statische Files).

## Offene Fragen vor dem Bauen

1. **Sprache:** Deutsch (passend zu SheX/DACH) – richtig?
2. **Realismus-Level:** Wie explizit dürfen die Beispielchats sein? Coaching-mäßig erotisch-suggestiv (wie im Julian-Beispiel mit Dusche/Banane/Kommen) oder soft (nur Mechanik, ohne harte Sex-Begriffe)?
3. **Anzahl & Themen:** Reichen die 3 oben vorgeschlagenen PDFs für Start, oder willst du andere/mehr Themen (z.B. "Umgang mit Korb", "Custom Content Verkauf", "Mass-DM-Follow-up")?
4. **Format:** PDF (klassisch, druckbar) oder lieber direkt eine **interaktive Web-Page** im Dashboard mit aufklappbaren Bubbles + Erklärungen? PDF ist offline lesbar, Web fühlt sich premiumer + nativer an.

Sobald du auf 1–4 antwortest, baue ich PDF #1 als Proof-of-Concept, du gibst Feedback zum Look, dann ziehe ich #2 und #3 nach.
