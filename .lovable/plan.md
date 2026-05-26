## Ziel
Der Button in der Inspirationsbibliothek soll nicht mehr dynamisch zwischen „Jetzt durchlesen“, „Weiterlesen“ und „Nochmal lesen“ wechseln, sondern immer den Text **„zur ganzen Bibliothek“** anzeigen.

## Änderung
- **Datei:** `src/components/InspirationLibrary.tsx`
- **Aktion:** Den dynamischen `ctaLabel` (Zeilen 58–62) entfernen und durch den statischen String `"zur ganzen Bibliothek"` ersetzen.

## Ergebnis
Der CTA-Button unter den PDF-Karten zeigt unabhängig vom Lese-Status immer denselben Text an und leitet weiterhin zum ersten verfügbaren Inhalt (Chat-Breakdown) oder zeigt die „bald verfügbar“-Info.