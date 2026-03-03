

## Plan: "Warum dauert das so lange?" – Audio-Popup im Abrechnungszeitraum

### Was passiert

In der `DashboardBillingInfo`-Komponente wird oben rechts ein klickbarer Text **"Warum dauert das so lange?"** hinzugefügt. Beim Klick öffnet sich ein Dialog/Popover mit einem HTML-Audio-Player, der deine eingesprochene Memo abspielt.

### Schritte

1. **Audio-Datei hochladen** – Du lädst die Audio-Datei hoch (z.B. MP3). Ich lege sie unter `public/audio/` ab (z.B. `billing-info.mp3`).

2. **UI anpassen (`src/pages/Dashboard.tsx`)** – In der `DashboardBillingInfo`-Komponente:
   - Header-Zeile erweitern: Links bleibt das Clock-Icon + "Abrechnungszeitraum", rechts kommt ein kleiner klickbarer Text "Warum dauert das so lange?" mit einem `HelpCircle`-Icon.
   - Beim Klick öffnet sich ein `Dialog` mit einem nativen `<audio controls>`-Player, der die hochgeladene Datei abspielt.
   - Kurzer Erklärungs-Text über dem Player (z.B. "Hier erkläre ich dir, warum der Abrechnungszeitraum so lang ist.").

### Nächster Schritt

Bitte lade jetzt die Audio-Datei hoch, dann setze ich alles um.

