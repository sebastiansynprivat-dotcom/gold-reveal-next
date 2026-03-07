

## Fix: Crown-Animation beim Bonus-Modell cleaner machen

### Problem
Die `Crown`-Ikone nutzt `streak-circle-pulse` — eine `box-shadow`-basierte Puls-Animation. Da Lucide-Icons inline SVGs sind, wirkt der pulsierende Box-Shadow auf das rechteckige Bounding-Box des SVG-Elements, was ein unclean wirkendes Flackern/Rendering erzeugt.

### Lösung
Die `streak-circle-pulse`-Klasse entfernen und stattdessen eine sanfte Opacity+Scale-Animation per Framer Motion verwenden:

**Zeile ~991 in `src/pages/Dashboard.tsx`:**
```tsx
// Vorher:
<Crown className="h-4 w-4 lg:h-5 lg:w-5 text-accent streak-circle-pulse" />

// Nachher:
<motion.div
  animate={{ scale: [1, 1.12, 1], opacity: [0.85, 1, 0.85] }}
  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
>
  <Crown className="h-4 w-4 lg:h-5 lg:w-5 text-accent" />
</motion.div>
```

Das ergibt einen smoothen, dezenten Puls ohne Box-Shadow-Artefakte auf dem SVG.

### Dateien
- `src/pages/Dashboard.tsx` — 1 Stelle ändern (Zeile ~991)

