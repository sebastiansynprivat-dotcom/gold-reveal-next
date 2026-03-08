

## Problem

Das "Accounts verwalten"-Popup (`reassignTarget`-Dialog) bei Chattern nutzt ein einfaches, schmales Layout (`sm:max-w-md`) ohne die Premium-Haptik der anderen Dialoge (Account-Pool, Freie Accounts). Es fehlen visuelle Akzente wie Stats-Zeile, bessere Karten-Struktur und konsistentes Styling.

## Plan

### "Accounts verwalten"-Dialog aufwerten (src/pages/AdminDashboard.tsx)

1. **Dialog breiter machen**: `sm:max-w-md` → `sm:max-w-lg` für mehr Platz

2. **Header aufwerten**: Gold-Gradient-Linie oben (wie bei anderen Dialogen), Icon-Box mit `gold-glow`-Effekt, Chatter-Name prominenter darstellen

3. **Zugewiesene Accounts als Premium-Karten**:
   - Jede Account-Karte bekommt `gold-gradient-border-animated` oder `card-hover-glow`-Effekt
   - Sprache-Badge (🇩🇪/🇬🇧) und Agency-Badge (SheX/SYN) hinzufügen (wie bei den anderen Dialogen)
   - Subtiler Hover-Glow auf den Karten

4. **Separator aufwerten**: Der "Account zuweisen"-Trennstrich bekommt den Gold-Gradient-Stil (wie `header-gradient-border`)

5. **Freie Accounts-Bereich aufwerten**:
   - Pool/Manual-Sektionen mit dezenten Gold-Akzenten an den Collapsible-Headers
   - Account-Items mit Hover-Glow und sanfteren Transitions
   - Plus-Icon als Gold-Accent beim Hover

6. **Leere-State aufwerten**: Leere Zustände mit subtilerem Gold-Glow statt plain glass-card

7. **Suchfeld**: `input-gold-shimmer`-Klasse für den Focus-Effekt

