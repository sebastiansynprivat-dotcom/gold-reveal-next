

# Auto-Scroll zur Detail-Ansicht

## Was passiert
Wenn man im **Model Dashboard** oder **Mitarbeiter Dashboard** einen Eintrag in der Tabelle anklickt, scrollt die Seite automatisch runter zur Detail-Ansicht.

## Umsetzung

### 1. `src/components/ModelDashboardTab.tsx`
- `useRef` für die Detail-Section erstellen
- Beim Klick auf einen Account (`setSelectedAccountId`) nach kurzem Delay (`setTimeout 100ms`) `ref.current.scrollIntoView({ behavior: "smooth", block: "start" })` aufrufen
- Ref an das Detail-`motion.div` (Zeile ~880) anhängen

### 2. `src/components/ChatterDashboardTab.tsx`  
- Gleiche Logik: `useRef` + `scrollIntoView` beim Klick auf einen Chatter/Mitarbeiter (`setSelectedId`)
- Ref an die Detail-Section anhängen

Beide Scrolls nutzen `behavior: "smooth"` und `block: "start"` für ein konsistentes UX-Erlebnis.

