

## Problem

Der "Freie Accounts"-Dialog (`manualPoolOpen`) nutzt ein schmales Single-Column-Layout (`sm:max-w-lg`) ohne Split-Layout, während der Account-Pool-Dialog (`accountPoolOpen`) ein breiteres Split-Layout hat (`sm:max-w-3xl`) mit dem "Neuer Account"-Formular links und der Account-Liste rechts. Der User möchte dasselbe Layout.

## Plan

### Freie-Accounts-Dialog an Account-Pool-Layout angleichen

**Änderungen in `src/pages/AdminDashboard.tsx`:**

1. **Dialog breiter machen**: `sm:max-w-lg` → `sm:max-w-3xl` für den `manualPoolOpen`-Dialog

2. **Split-Layout einbauen**: Den Dialog-Inhalt in ein `flex-row`-Layout umbauen:
   - **Links (280px)**: "Neuer Account"-Formular (aktuell hinter `openFolder === "__add__"` versteckt) — permanent sichtbar wie beim Pool-Dialog. Enthält: Domain, E-Mail, Passwort, Drive Folder ID, Ordner-Auswahl, Model-Sprache (DE/EN), Model-Agency (SheX/SYN), Model-aktiv-Switch, Hinzufügen-Button
   - **Rechts (flex-1)**: Ordner-/Account-Ansicht mit Stats-Zeile oben, Suchfeld, Filter-Pills (Alle/Frei/Vergeben), und der bestehenden Ordner-Grid + Account-Liste

3. **Stats-Zeile** nach oben ziehen (wie beim Pool-Dialog): Gesamt / Frei / Vergeben als Badges in einer Row unterhalb des Headers

4. **"Account hinzufügen"-Button unten entfernen**, da das Formular jetzt permanent links sichtbar ist

5. **Header angleichen**: Delete-Button und ggf. Auto-Zuweisen-Button in die Header-Zeile neben den Titel (wie beim Pool-Dialog)

6. **Responsiv**: Auf Mobile (`sm:` Breakpoint) stacked statt side-by-side, Formular oben als collapsible Section

