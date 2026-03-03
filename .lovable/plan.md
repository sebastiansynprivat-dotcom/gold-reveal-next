## Plan: Tägliche To-Do-Checkliste im Dashboard

Eine interaktive tägliche Checkliste wird im Dashboard unter den Stats-Cards und über dem Bonus-Modell eingefügt. Die Aufgaben orientieren sich an der SheX-Arbeitsweise.

### Aufgaben in der Checkliste

- Hast du bis zu 6 MassDM`s gemacht?
- Deine alte MassDM gelöscht bevor eine neue gesendet wird?
- Geschaut ob wit für dich gepostet haben? (Falls nicht, gib uns bitte eine Info in der Gruppe)
- Auf alle Nachrichten geantwortet die in deinem Account offen sind?

### Umsetzung

**Neue Komponente: `src/components/DailyChecklist.tsx**`

- Checkbox-Liste mit den 3 täglichen Aufgaben
- Fortschritts-Anzeige mit Progress-Bar
- Zustand wird in `localStorage` gespeichert mit Tages-Key (z.B. `daily_checklist_2026-03-03`), sodass die Liste jeden Tag zurückgesetzt wird
- Nutzt vorhandene `Checkbox`, `Progress` und `framer-motion` Komponenten
- Gleicher `glass-card-subtle` Stil wie die anderen Dashboard-Karten

**Datei: `src/pages/Dashboard.tsx**`

- Import der neuen `DailyChecklist` Komponente
- Einbau zwischen Stats-Cards und Bonus-Modell Sektion