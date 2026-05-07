# Bonus-Modell hinter Demo-Flag verstecken

Die komplette `BonusModelSection` (Staffel/Bonus-Modell-Karte) im Chatter-Dashboard wird nur noch gerendert, wenn der bestehende Demo-Flag aktiv ist — gleiche Mechanik wie bei den anderen Demo-Elementen.

## Änderung

In `src/pages/Dashboard.tsx` (Zeile ~1566–1574) den Aufruf von `<BonusModelSection ... />` mit `{isDemoMode() && (...)}` umschließen.

`isDemoMode` ist bereits oben in der Datei importiert.

## Bedienung
- **Aus** (Standardzustand für alle Chatter): nichts zu tun, Bonus-Modell ist weg
- **Ein** für dich: einmal `https://shex-dashboard.com/dashboard?demo=1` öffnen → Bonus-Modell + alle anderen Demo-Schalter erscheinen wieder
- **Wieder aus**: `?demo=0`

## Geänderte Dateien
- `src/pages/Dashboard.tsx`
