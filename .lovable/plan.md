

## Mouse-Following Gold Glow Effect auf der Auth-Seite

Ein radiales Gold-Highlight, das dem Mauszeiger folgt – ein subtiler Spotlight-Effekt auf dem dunklen Hintergrund.

### Umsetzung

**In `src/pages/Auth.tsx`:**
- `onMouseMove`-Handler auf dem äußeren Container trackt die Mausposition
- CSS custom properties (`--mouse-x`, `--mouse-y`) werden per `useRef` auf dem Container gesetzt
- Ein `radial-gradient` im Background reagiert auf diese Variablen:
  ```
  radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), 
    hsl(43 56% 52% / 0.06), transparent 40%)
  ```
- Der Effekt ist dezent (ca. 6% Opacity) und verschwindet sanft am Rand
- Kein State-Update nötig → performant über CSS-Variablen direkt am DOM-Element

Das ergibt einen eleganten, interaktiven Spotlight-Effekt, der dem Cursor auf dem schwarzen Hintergrund folgt.

