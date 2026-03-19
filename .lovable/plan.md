

## Plan: Status-Übersicht entfernen & neue BotDM-Tabelle im Google-Sheets-Stil

### Was passiert

1. **Status-Übersicht Section entfernen** (Zeilen 879-1000 in `ModelDashboardTab.tsx`) — die drei Plattform-Collapsibles mit BotDM/MassDM/Account-Setup-Checkboxen werden komplett rausgenommen. Die zugehörigen State-Variablen und Save-Logic bleiben erhalten, da sie weiterhin von der neuen Tabelle genutzt werden.

2. **Neue "BotDMs & Setup" Section** — ersetzt die alte Status-Übersicht mit einem tabellarischen Google-Sheets-Layout:

```text
┌──────────────────────────────────────────────────────────┐
│  🔍 Suche...          │ [Alle] [4Based] [Maloum] [Brezzels] │
├──────────────────────────────────────────────────────────┤
│  Account              │ Plattform │ BotDM │ Welcome │ MassDM │
├──────────────────────────────────────────────────────────┤
│  user@example.com     │ 4Based    │  ☑    │   ☑     │   ☐    │
│  model@mail.de        │ Maloum    │  ☑    │   ☐     │   ☑    │
│    └─ Follow-Up: ...  │           │       │         │        │
│  xyz@test.com         │ Brezzels  │  ☐    │   ☑     │   ☑    │
└──────────────────────────────────────────────────────────┘
```

### Technische Details (Datei: `src/components/ModelDashboardTab.tsx`)

**Neue Section ersetzt Zeilen 879-1000:**
- Eigener Plattform-Filter (Alle/4Based/Maloum/Brezzels) mit goldenen Pill-Buttons
- Suchfeld mit `input-gold-shimmer` Effekt
- Tabelle mit goldenem Header-Gradient und fixiertem Kopf
- Jede Zeile zeigt: Account-Email, Plattform-Badge, drei Checkboxen (BotDM, Welcome/Account Setup, MassDM)
- **Nur bei Maloum-Accounts**: Unterhalb der Zeile erscheint ein expandierbares Follow-Up-Feld (aus `bot_messages` Tabelle, `follow_up_message`)
- Checkboxen togglen direkt die bestehenden State-Variablen und speichern per Auto-Save
- Zeilen nutzen `bg-card/40` mit `border-border/30` Trennlinien und Hover-Highlight (`hover:bg-accent/5`)
- Goldene Akzente: Header-Zeile mit `bg-accent/10`, Checkbox-Checks in `text-accent`

**Mapping der Spalten auf bestehende DB-Felder:**
- "BotDM" → `fourbased_botdm_done` / `maloum_botdm_done` / `brezzels_botdm_done`
- "Welcome" (= Account Setup) → `fourbased_submitted` / `maloum_submitted` / `brezzels_submitted`
- "MassDM" → `fourbased_massdm_done` / `maloum_massdm_done` / `brezzels_massdm_done`

**Keine DB-Änderungen nötig** — alle Felder existieren bereits in `model_dashboard`.

