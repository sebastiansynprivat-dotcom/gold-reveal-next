## Ziel
Im Admin-Dashboard im Tab "Anfragen": Wenn auf eine Anfrage-Karte (Beschreibung) geklickt wird, soll zusätzlich zum bestehenden Kopieren in die Zwischenablage automatisch WhatsApp in der Chatlisten-Ansicht geöffnet werden, damit der Admin direkt nach dem Model/Creator suchen und die Nachricht einfügen kann.

## Umsetzung
In `src/pages/AdminDashboard.tsx` (ca. Zeile 5237–5264), beim Beschreibungs-Button der Anfrage-Karte:

1. Bestehender Klick-Handler bleibt: Text wird via `navigator.clipboard.writeText(fullText)` kopiert.
2. Danach wird WhatsApp geöffnet — und zwar in der Chatlisten-/Such-Ansicht, nicht in einem konkreten Chat:
   - Mobil (iOS/Android via User-Agent-Check): `window.location.href = "whatsapp://"` — öffnet die WhatsApp-App auf der zuletzt aktiven Ansicht (Chatliste).
   - Desktop: `window.open("https://web.whatsapp.com/", "_blank")` — öffnet WhatsApp Web mit Chatliste + Suchfeld oben links.
3. Toast-Text leicht anpassen: "Nachricht kopiert – WhatsApp geöffnet, Model suchen und einfügen."

Hinweis: `wa.me/?text=...` wird bewusst NICHT verwendet, weil das einen leeren Chat erzwingt statt der Chatlisten-Ansicht mit Suche.

## Scope
- Nur der Beschreibungs-Button der Anfrage-Karten im Admin-Dashboard-Tab "Anfragen".
- Andere Copy-Buttons (Model Name, Kundenname) bleiben unverändert.
- Keine Backend-/Datenbank-Änderungen.
