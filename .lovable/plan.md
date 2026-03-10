
# Fortschrittsanzeige und Schritt-Nummerierung fur OfferB

## Was wird gemacht

### 1. Alle Schritte als einheitliche Liste definieren
Die Videos und Links werden zu einer gemeinsamen Schritt-Liste zusammengefasst:
- Schritt 1: Plattform Erklärungs Video
- Schritt 2: Telegram Nachrichten Video
- Schritt 3: Brezzels Notifications aktivieren
- Schritt 4: My ID Bot einrichten
- Schritt 5: Tägliches Feedback

### 2. Fortschritts-Bar oben auf der Seite
Direkt unter dem Hero-Bereich wird eine Progress-Bar eingefügt, die den Gesamtfortschritt anzeigt (z.B. "2 von 5 Schritten erledigt"). Nutzt die vorhandene `Progress`-Komponente im Gold-Styling.

### 3. Klickbare Checkliste
Unter der Progress-Bar eine kompakte Checkliste mit allen 5 Schritten. Jeder Schritt hat:
- Eine Checkbox zum Abhaken
- Schritt-Nummer ("Schritt 1", "Schritt 2" etc.)
- Kurzer Titel

Der Fortschritt wird im `localStorage` gespeichert, damit er beim Neuladen erhalten bleibt.

### 4. Schritt-Nummern bei den Sektionen
Jede Video-/Link-/Feedback-Sektion bekommt eine prominente Schritt-Nummer als Badge (z.B. goldener Kreis mit "1" darin) neben dem Titel.

## Technische Details

**Datei: `src/pages/OfferB.tsx`**

- Neue `steps`-Array-Konstante mit id, title, type fur alle 5 Schritte
- `useState` + `localStorage` fur `completedSteps: Set<number>`
- Progress-Bar-Sektion nach dem Hero mit `Progress`-Komponente (Wert = `completedSteps.size / steps.length * 100`)
- Checkliste mit `Checkbox`-Komponenten, gestylt im bestehenden `glass-card-subtle` Look
- Videos bekommen "Schritt 1" / "Schritt 2" als nummerierte Badge-Kreise
- Links-Sektion wird zu Schritt 3 und 4 mit individuellen Nummern
- Feedback wird Schritt 5
- Erledigte Schritte bekommen eine subtile visuelle Markierung (leicht reduzierte Opazitat / Hakchen)

Keine neuen Abhangigkeiten notwendig -- nutzt vorhandene `Progress`, `Checkbox` und `framer-motion`.
