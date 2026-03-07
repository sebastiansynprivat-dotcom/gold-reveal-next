

## Plan: Empfehlungsprogramm-Kachel unter "Rechnung erstellen"

### Platzierung
Direkt unter dem "Rechnung erstellen"-Button in der `DashboardBillingInfo`-Komponente (Zeile ~1124).

### Neue Kachel
Eine `glass-card` mit Gold-Akzent:
- Icon (Users/Gift) + Titel: **"Empfehle deine Freunde"**
- Untertitel: **"Verdiene 1% von dem, was sie verdienen – Lifetime"**
- Button "Mehr erfahren" öffnet ein Dialog-Popup

### Dialog-Inhalt
1. **Erklärung**: Kurzer Text zum Programm (1% Lifetime-Provision)
2. **LinkedIn-Link**: Platzhalter-Button "Zur Bewerbung (LinkedIn)" – URL wird später eingefügt
3. **Wichtiger Hinweis**: Dein Freund muss im Bewerbungsprozess deinen **Gruppennamen** angeben, damit die Empfehlung registriert wird. Der aktuelle Gruppenname wird aus dem State dynamisch angezeigt.
4. **Kopierbarer Text**: Vorgefertigte Nachricht mit LinkedIn-Link, die per Klick kopiert wird (Copy-to-Clipboard mit Toast-Feedback). Beispiel:

> "Hey! Ich arbeite als Chatter und verdiene damit richtig gutes Geld. Wenn du Lust hast, bewirb dich hier: [LinkedIn-Link]. Gib bei der Bewerbung meinen Gruppennamen „{groupName}" an – das ist wichtig, damit es zugeordnet werden kann!"

### Technisch
- Alles in `src/pages/Dashboard.tsx` innerhalb `DashboardBillingInfo` (+ groupName als Prop durchreichen)
- LinkedIn-URL als Konstante (Platzhalter `"LINKEDIN_URL"` bis der User sie liefert)
- Copy nutzt `navigator.clipboard.writeText` + `toast.success`
- Keine DB-Änderungen nötig

