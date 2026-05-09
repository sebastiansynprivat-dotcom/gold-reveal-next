## Ziel
Das gelieferte Drop-in Design Sheet wird **ausschließlich im Admin-Bereich** (`/admin`, `/admin/login`, `/admin/notifications`) angewendet. Außerhalb des Admin bleibt alles unverändert (User-Dashboard, Landing, Onboarding, Quiz, Model etc.).

## Vorgehen

### 1. Neue CSS-Datei `src/styles/admin-design.css`
- Inhalt = das gelieferte Token-Sheet, aber **alle globalen Selektoren scoped** auf `.admin-scope`:
  - `body { … }` → `.admin-scope { … }` (Hintergrund, Font, min-height etc.)
  - `* { scrollbar-width: none }` → `.admin-scope *`
  - `*::-webkit-scrollbar` → `.admin-scope *::-webkit-scrollbar`
  - `h1…h6`, `input`, `textarea` → mit `.admin-scope`-Präfix
  - `.premium-card`, `.btn-gold`, `.nav-item`, `.list-row`, `.tab`, `.status-dot`, Animationen, `.kpi-value` etc. → unverändert (Klassen wirken nur dort, wo gesetzt)
  - `:root` Tokens werden auf `.admin-scope` gelegt, damit `var(--gold)` etc. nur dort verfügbar sind und nichts global überschreiben
- Inter-Font-Import (`@import url(...Inter...)`) bleibt — wirkt nur, wo `.admin-scope` font-family setzt
- `@media (prefers-reduced-motion)` bleibt global (harmlos)

### 2. Globaler Import
- In `src/index.css` ganz unten: `@import "./styles/admin-design.css";`
- Tokens sind geladen, aber inaktiv außerhalb von `.admin-scope`

### 3. Wrapper-Klasse setzen
Auf jeder Admin-Seite den Root-Container mit `admin-scope` versehen:
- `src/pages/AdminDashboard.tsx`
- `src/pages/AdminLogin.tsx`
- `src/pages/AdminNotifications.tsx`

Zusätzlich setzen wir auf `<body>` per `useEffect` die Klasse `admin-scope`, solange eine Admin-Route aktiv ist (für Portale/Dialoge/Toasts, die außerhalb des Page-Trees in den Body rendern). Beim Unmount wird sie wieder entfernt.

### 4. Komplett-Override-Brücke (zu bestehenden Tailwind-Tokens)
Damit der Override wirklich greift ohne tausende Komponenten umzuschreiben, mappen wir innerhalb von `.admin-scope` die zentralen shadcn-Tokens auf die neuen Werte:

```css
.admin-scope {
  --background: 240 6% 4%;
  --foreground: 0 0% 96%;
  --card: 240 6% 5%;
  --muted-foreground: 0 0% 64%;
  --border: 0 0% 100% / 0.07;
  --accent: 40 45% 55%;
  --primary: 40 45% 55%;
  --radius: 0.75rem;
}
```
(HSL-Tripel-Format passend zu Tailwind/shadcn — Werte aus dem Drop-in übernommen.)

Damit übernehmen bestehende Klassen wie `bg-background`, `text-foreground`, `border-border`, `text-accent` automatisch die neue Champagner-Gold-Palette **nur im Admin**, ohne dass jede Komponente angefasst werden muss.

Zusätzlich wird `.glass-card` innerhalb von `.admin-scope` auf das neue `.premium-card`-Look gemappt (gleicher Gradient/Border/Shadow), damit alle bestehenden Karten sofort den Premium-Look bekommen.

### 5. Verifikation
- Preview auf `/admin` öffnen → Hintergrund leicht warm-schwarz mit Vignette, Inter geladen, Karten mit Glas-Effekt, Gold-Akzente.
- Preview auf `/dashboard` (User) → unverändert.
- Scrollbars im Admin verschwunden, anderswo sichtbar.
- Runtime-Errors prüfen.

## Was NICHT geändert wird
- Keine Logik in Komponenten
- Keine bestehenden Tailwind-Klassen entfernt
- Keine globalen Body-/Font-Styles außerhalb `.admin-scope`
- User-, Model-, Landing-, Onboarding-, Quiz-Seiten bleiben 1:1 wie heute

## Memory-Update nach Implementierung
Neuer Eintrag `mem://style/admin-design-tokens` mit Hinweis: Admin nutzt eigenes Champagner-Gold-Token-Sheet, scoped via `.admin-scope`.