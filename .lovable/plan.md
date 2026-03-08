

## Problem

Die gold-shimmer Animation (`input-gold-shimmer`) beim Fokussieren von Text-Eingabefeldern existiert nur auf der Auth-Seite. Der User möchte diese Animation auf **alle** Input-Felder im Chatter-Dashboard anwenden.

## Betroffene Dateien & Inputs

### 1. `src/pages/Dashboard.tsx` (5 Input-Felder)
- Telegram ID Input
- Gruppenname Input  
- Umsatz Input (number)
- Mobile-Varianten der gleichen Felder

### 2. `src/components/DashboardChat.tsx` (1 Input-Feld)
- Chat-Nachricht Input ("Frage stellen...")

### 3. `src/components/ModelRequestDialog.tsx` (Input + Textarea Felder)
- Model-Request Formularfelder

### 4. `src/components/ModelDashboardTab.tsx` (Input + Textarea Felder)
- Model-Dashboard Einstellungsfelder

## Umsetzung

Jeden `<Input>` (und `<Textarea>`) in einen Wrapper-`<div>` mit der Klasse `input-gold-shimmer rounded-xl` einpacken — genau wie auf der Auth-Seite. 

Die CSS-Klasse `.input-gold-shimmer` existiert bereits in `index.css` und zeigt beim `focus-within` einen animierten conic-gradient Gold-Border + subtilen Glow.

**Muster:**
```tsx
// Vorher:
<Input value={...} className="h-7 text-xs w-44" />

// Nachher:
<div className="input-gold-shimmer rounded-lg">
  <Input value={...} className="h-7 text-xs w-44 border-transparent" />
</div>
```

Wichtig: Die Input-Border auf `border-transparent` setzen, damit sie nicht mit der Shimmer-Border kollidiert.

